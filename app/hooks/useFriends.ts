import { useState, useCallback, useRef } from "react";
import axios from "axios";
import { 
  collection, query, where, getDocs, doc, getDoc 
} from "firebase/firestore";

import { User, Friend } from "@/app/types";
import { db } from "../lib/firebaseConfig";
import { debouncedFetch } from "../utils/dbUtils";

export const useFriends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myFriends, setMyFriends] = useState<Friend[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getUserFriends = useCallback(async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        console.error("User document does not exist!");
        return null;
      }

      const userData = userSnapshot.data() as User;

      const friendsRef = collection(db, "users");
      const friendsQuery = query(friendsRef, where("name", "in", userData.friends || []));

      const friendsSnapshot = await getDocs(friendsQuery);
      const userFriends = friendsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Friend[];

      setMyFriends(userFriends);
      return { userData, userFriends };
    } catch (error) {
      console.error("Error fetching user friends:", error);
      return null;
    }
  }, []);

  const fetchSimilarUsers = useCallback(
    async (user: User) => {
      const fetchMethod = async () => {
        try {
          
          const userInterests = user.interests?.length ? user.interests.join(", ") : "";
          const response = await axios.post(
            "https://tuplesai.onrender.com:5000/api/similar_users",
            { user_interests: userInterests },
            { timeout: 3000 }
          );

          const { similar_users } = response.data;

          if (
            Array.isArray(similar_users) &&
            similar_users.every(
              (user) =>
                typeof user.name === "string" &&
                Array.isArray(user.interests) &&
                typeof user.userId === "string" &&
                typeof user.id === "string"
            )
          ) {
            const formattedFriends = similar_users
              .map(({ id, name, interests, userId }) => ({ id, name, interests, userId }))
              .filter(
                (friend) =>
                  friend.name !== user.name && !user.friends.includes(friend.name)
              );
            
            if (formattedFriends.length > 0) {
              setFriends(formattedFriends);
              return;
            }
          }

          await fetchSimilarUsersGemini(user);
        } catch (error) {
          console.warn("Primary API failed. Falling back to Gemini recommendation.");
          await fetchSimilarUsersGemini(user);
        }
      };

      debouncedFetch(lastFetchTime, setLastFetchTime, fetchMethod, fetchTimeoutRef);
    },
    [lastFetchTime]
  );

  const fetchSimilarUsersGemini = useCallback(
    async (user: User) => {
      try {
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        const allUsers = usersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name,
            interests: doc.data().interests || [],
            userId: doc.data().userId,
            profilePicUrl: doc.data().profilePicUrl
          }))
          .filter((u) => u.name !== user.name && !user.friends.includes(u.name));

        const userInterests = user.interests?.length ? user.interests.join(", ") : "";
        const allUsersData = allUsers
          .map((u) => `${u.name}: ${u.interests.join(", ")}`)
          .join("\n");

        const API_KEY = process.env.GEMINI_API_KEY;
        const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

        const prompt = `Rank the top 5 most similar users to a user with interests: ${userInterests}
        Users data:
        ${allUsersData}
        
        Return top 5 user names, one per line, with only the name.if less than total 5 users are there then return only those many users but in similarity order. like if only 2 users are there then return the most similar user first and then the second most similar user.`;

        const response = await axios.post(`${API_URL}?key=${API_KEY}`, {
          contents: [{ parts: [{ text: prompt }] }]
        }, { timeout: 5000 });

        const generatedText = response.data.candidates[0].content.parts[0].text;
        const similarUserNames = generatedText
          .split("\n")
          .map((line: string) => line.trim())
          .filter((name: string) => name.length > 0);

        const similarUsers = similarUserNames
          .map((name: string) => allUsers.find((u) => u.name === name))
          .filter((user: Friend | undefined): user is Friend => user !== undefined)
          .slice(0, 5);

        if (similarUsers.length > 0) {
          setFriends(similarUsers);
          console.log("Gemini recommendation successful.");
        } else {
          console.log("Gemini recommendation returned 0.");
          await fetchRandomUsers(user);
        }
      } catch (error) {
        console.warn("Gemini recommendation failed. Falling back to random users.");
        await fetchRandomUsers(user);
      }
    },
    []
  );

  const fetchRandomUsers = useCallback(async (user: User) => {
    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);

      const allUsers = usersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          interests: doc.data().interests || [], // Ensure interests is always an array
          userId: doc.data().userId,
          profilePicUrl: doc.data().profilePicUrl
        }))
        .filter((u) => 
          u.name !== user.name && 
          !user.friends.includes(u.name) &&
          u.interests // Ensure interests exist
        );

      // Safely check interest overlap
      const usersWithInterestOverlap = allUsers.filter(u => 
        u.interests.length > 0 && 
        user.interests?.length && 
        u.interests.some((interest: string) => user.interests.includes(interest))
      );

      const recommendedUsers = usersWithInterestOverlap.length > 0
        ? usersWithInterestOverlap.sort(() => 0.5 - Math.random()).slice(0, 5)
        : allUsers.sort(() => 0.5 - Math.random()).slice(0, 5);

      setFriends(recommendedUsers);
      return recommendedUsers;
    } catch (error) {
      console.error("Failed to fetch random users", error);
      return [];
    }
  }, []);

  const refreshFriends = useCallback(
    async (userId: string, user?: User) => {
      const friendResults = await getUserFriends(userId);
      if (friendResults && user) {
        setMyFriends(friendResults.userFriends);
        await fetchSimilarUsers(user);
      }
    },
    [getUserFriends, fetchSimilarUsers]
  );

  return {
    friends,
    myFriends,
    setFriends,
    setMyFriends,
    getUserFriends,
    fetchSimilarUsers,
    fetchRandomUsers,
    refreshFriends
  };
};