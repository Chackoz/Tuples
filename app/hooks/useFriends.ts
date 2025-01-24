import { useState, useCallback, useRef } from "react";
import axios from "axios";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

import { User, Friend } from "@/app/types";
import { db } from "../lib/firebaseConfig";
import { debouncedFetch } from "../utils/dbUtils";

export const useFriends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myFriends, setMyFriends] = useState<Friend[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const getUserFriends = useCallback(async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        console.log("User document does not exist!");
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

  // Fetch Similar Users (Primary Method)
  const fetchSimilarUsers = useCallback(
    async (user: User) => {
      fetchRandomUsers(user);
      const fetchMethod = async () => {
        try {
          const userInterests = user.interests.join(", ");
          const response = await axios.post(
            "https://tuplesai.onrender.com:5000/api/similar_users",
            {
              user_interests: userInterests
            }
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
            setFriends(formattedFriends);
            console.log(
              "Similar users fetched successfully:",
              formattedFriends,
              "Time",
              Date.now()
            );
          } else {
            console.error("Invalid similar_users structure:", similar_users);
            await fetchRandomUsers(user);
            await fetchSimilarUsersGemini(user);
          }
        } catch (error) {
          console.error("Error fetching similar users:", error);
          await fetchRandomUsers(user);
          await fetchSimilarUsersGemini(user);
        }
      };

      debouncedFetch(lastFetchTime, setLastFetchTime, fetchMethod, fetchTimeoutRef);
    },
    [lastFetchTime]
  );

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Similar Users (Gemini Fallback)
  const fetchSimilarUsersGemini = useCallback(
    async (user: User) => {
      const fetchMethod = async () => {
        try {
          const usersRef = collection(db, "users");
          const usersSnapshot = await getDocs(usersRef);
          const allUsers = usersSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              name: doc.data().name,
              interests: doc.data().interests,
              userId: doc.data().userId,
              profilePicUrl: doc.data().profilePicUrl
            }))
            .filter((u) => u.name !== user.name && !user.friends.includes(u.name));

          const userInterests = user.interests.join(", ");
          const allUsersData = allUsers
            .map((u) => `${u.name}: ${u.interests.join(", ")}`)
            .join("\n");

          const API_KEY = process.env.GEMINI_API_KEY;
          const API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

          const prompt = `Given the following user interests: ${userInterests}, and the list of other users with their interests in the form
          User : Interests(comma seperated) :
          
          ${allUsersData}
  
        Rank the top 5 most similar users based on their interests. Return the results in the following format
  
        1. [User Name]
        2. [User Name]
        3. [User Name]
        4. [User Name]
        5. [User Name]
  
        Only include the names in your response(no formatting the name), no additional text.`;

          console.log("Fetching similar users with Gemini:", prompt, "Time", Date.now());

          const response = await axios.post(`${API_URL}?key=${API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }]
          });

          const generatedText = response.data.candidates[0].content.parts[0].text;
          const similarUserNames = generatedText
            .split("\n")
            .map((line: string) => line.split(". ")[1].trim());

          const similarUsers = similarUserNames
            .map((name: any) => allUsers.find((u) => u.name === name))
            .filter((user: Friend): user is Friend => user !== undefined)
            .map(
              (user: {
                id: any;
                name: any;
                interests: any;
                userId: any;
                profilePicUrl: any;
              }) => ({
                id: user.id,
                name: user.name,
                interests: user.interests,
                userId: user.userId,
                profilePicUrl: user.profilePicUrl
              })
            );

          setFriends(similarUsers);
          if (similarUsers.length <= 0) {
            console.log("No similar users found. Fetching random users instead.");
            fetchRandomUsers(user);
            return;
          }

          console.log(
            "Similar users fetched successfully:",
            similarUsers,
            "Time",
            Date.now()
          );
        } catch (error) {
          console.error("Error fetching similar users:", error);
          await fetchRandomUsers(user);
        }
      };

      debouncedFetch(lastFetchTime, setLastFetchTime, fetchMethod, fetchTimeoutRef);
    },
    [lastFetchTime]
  );

  const fetchRandomUsers = useCallback(async (user: User) => {
    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);

      const allUsers = usersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          interests: doc.data().interests,
          userId: doc.data().userId,
          profilePicUrl: doc.data().profilePicUrl
        }))
        .filter((u) => u.name !== user.name && !user.friends.includes(u.name));

      const randomUsers = allUsers.sort(() => 0.5 - Math.random()).slice(0, 5);

      setFriends(randomUsers);

      return randomUsers;
    } catch (error) {
      console.error("Error fetching random users:", error);
      return [];
    }
  }, []);

  const refreshFriends = useCallback(
    async (userId: string, user?: User) => {
      const friendResults = await getUserFriends(userId);
      if (friendResults) {
        setMyFriends(friendResults.userFriends);
        if (user) {
          await fetchSimilarUsers(user);
        }
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
