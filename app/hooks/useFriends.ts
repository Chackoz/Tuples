import { useState, useCallback } from 'react';
import axios from 'axios';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from 'firebase/firestore';

import { User, Friend } from '@/app/types';
import { db } from '../lib/firebaseConfig';

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
      const friendsQuery = query(
        friendsRef, 
        where("name", "in", userData.friends || [])
      );
      
      const friendsSnapshot = await getDocs(friendsQuery);
      const userFriends = friendsSnapshot.docs.map(doc => ({
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

  const fetchSimilarUsers = useCallback(async (user: User) => {
    try {
      const response = await axios.post("/api/similar_users", {
        user_interests: user.interests.join(", ")
      });

      const { similar_users } = response.data;
      
      const validSimilarUsers = similar_users.filter(
        (u: Friend) => 
          u.name !== user.name && 
          !user.friends.includes(u.name)
      ).slice(0, 5);

      setFriends(validSimilarUsers);
      return validSimilarUsers;
    } catch (error) {
      console.error("Similar users fetch failed", error);
      return await fetchRandomUsers(user);
    }
  }, []);
  
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

      const randomUsers = allUsers
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

      setFriends(randomUsers);
      return randomUsers;
    } catch (error) {
      console.error("Error fetching random users:", error);
      return [];
    }
  }, []);

  const refreshFriends = useCallback(async (userId: string, user?: User) => {
    const friendResults = await getUserFriends(userId);
    if (friendResults) {
      setMyFriends(friendResults.userFriends);
      if (user) {
        await fetchSimilarUsers(user);
      }
    }
  }, [getUserFriends, fetchSimilarUsers]);

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