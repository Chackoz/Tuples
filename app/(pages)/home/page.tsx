"use client";
import Dashboard from "@/app/components/Dashboard";
import NavBar from "@/app/components/NavBar";
import FriendCard from "@/app/components/ui/FriendCard";
import React, { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import axios from "axios";

interface User {
  name: string;
  interests: string[];
}

interface Friend {
  name: string;
  interests: string[];
}

function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);

  const getUserById = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data() as User;
        console.log("User fetched", userData);
        setUser(userData);
        fetchSimilarUsers(userData);
        return userData;
      } else {
        console.log("Document does not exist!");
        return null;
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  };

  const fetchSimilarUsers = async (user: User) => {
    try {
      const userInterests = user.interests
        .map((interest) => {
          if (interest === "🎨 UI/UX Design") return "UI/UX Design";
          if (interest === "🖥️ Backend Development") return "Backend Development";
          if (interest === "🌐 Full Stack Development") return "Full Stack Development";
          return interest;
        })
        .join(", ");
      console.log("User interests: ", userInterests);

      const response = await axios.post("http://127.0.0.1:5000/api/similar_users", {
        user_interests: userInterests
      });

      console.log("Response", response.data);
      const { similar_users } = response.data;

      if (Array.isArray(similar_users) && similar_users.every(user => Array.isArray(user) && typeof user[0] === 'string' && Array.isArray(user[1]))) {
        const formattedFriends = similar_users
          .map(([name, interests]) => ({ name, interests }))
          .filter(friend => friend.name !== user.name);
        setFriends(formattedFriends);
      } else {
        console.error("Invalid similar_users structure:", similar_users);
        await fetchRandomUsers(user.name);
      }
    } catch (error) {
      console.error("Error fetching similar users:", error);
      await fetchRandomUsers(user.name);
    }
  };

  const fetchRandomUsers = async (currentUserName: string) => {
    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const allUsers = usersSnapshot.docs
        .map(doc => ({ name: doc.data().name, interests: doc.data().interests }))
        .filter(user => user.name !== currentUserName); // Exclude current user
      
      // Shuffle the array and take the first 5 (or less if there are fewer users)
      const shuffled = allUsers.sort(() => 0.5 - Math.random());
      const randomUsers = shuffled.slice(0, 5);
      
      setFriends(randomUsers);
    } catch (error) {
      console.error("Error fetching random users:", error);
    }
  };

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("userId"))
      ?.split("=")?.[1];

    if (cookieValue) {
      getUserById(cookieValue);
    }
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-between bg-[#ebebeb] p-[10px]">
      <NavBar />
      <div className="flex w-full justify-between p-10">
        <Dashboard user={user} />
        <div className="w-[50vw] rounded-lg bg-white p-5">
          <h1 className="text-[2vw]"> Explore</h1>
        </div>
        <div className="w-[20vw] rounded-lg bg-white p-5">
          <h1 className="text-[2vw]">Add Friends</h1>
          <div className="w-full flex flex-col justify-center items-center gap-4">
            {friends.map((friend, index) => (
              <FriendCard key={index} friend={friend} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Page;