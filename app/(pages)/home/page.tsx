"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import axios from "axios";
import NavBar from "@/app/components/NavBar";
import Dashboard from "@/app/components/Dashboard";
import { jakartasmall } from "@/app/utils/fonts";


interface User {
  name: string;
  interests: string[];
  friends: string[];
}

interface Friend {
  name: string;
  interests: string[];
}

function FriendCard({ friend, currentUserId, onAddFriend }: { friend: Friend; currentUserId: string; onAddFriend: () => void }) {
  const addFriend = async () => {
    if (!currentUserId) {
      alert("User ID is missing. Please log in again.");
      return;
    }

    try {
      const userRef = doc(db, "users", currentUserId);
      await updateDoc(userRef, {
        friends: arrayUnion(friend.name)
      });
      alert(`${friend.name} added to your friends list!`);
      onAddFriend();
    } catch (error) {
      console.error("Error adding friend:", error);
      alert(`Failed to add friend: ${(error as Error).message}`);
    }
  };

  return (
    <div className="flex h-fit w-[90%] rounded-2xl bg-[#eeeeee] p-4">
      <div className="my-auto flex h-full w-full flex-col justify-center p-2">
        <h1 className="text-[1vw]">{friend.name}</h1>
        <h2 className="text-[0.6vw]">Interests: {friend.interests.join(", ")}</h2>
        <button 
          onClick={addFriend} 
          className="mt-2 bg-blue-500 text-white px-2 py-1 rounded text-[0.8vw] hover:bg-blue-600"
        >
          Add Friend
        </button>
      </div>
    </div>
  );
}

function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

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
      const userInterests = user.interests.join(", ");
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
        .filter(user => user.name !== currentUserName);
      
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
      setCurrentUserId(cookieValue);
      getUserById(cookieValue);
    } else {
      console.error("User ID not found in cookie");
      // Handle the case where user is not logged in
    }
  }, []);

  const handleAddFriend = () => {
    // Refresh user data after adding a friend
    if (currentUserId) {
      getUserById(currentUserId);
    }
  };

  return (
    <div className={`flex min-h-screen w-full flex-col items-center justify-between bg-[#ebebeb] p-[10px] ${jakartasmall.className}`}>
      <NavBar />
      <div className="flex w-full justify-between p-10">
        {user && <Dashboard user={user} />}
        <div className="w-[40vw] rounded-lg bg-white p-5">
          <h1 className="text-[2vw]"> Explore</h1>
          {/* Add explore content here */}
        </div>
        <div className="w-[20vw] rounded-lg h-fit min-h-[80vh] bg-white p-5">
          <h1 className="text-[2vw]">Add Friends</h1>
          <div className="w-full flex flex-col justify-center items-center gap-4">
            {friends.map((friend, index) => (
              <FriendCard 
                key={index} 
                friend={friend} 
                currentUserId={currentUserId} 
                onAddFriend={handleAddFriend}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;