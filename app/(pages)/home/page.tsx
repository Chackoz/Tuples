"use client";

import React, { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import axios from "axios";
import NavBar from "@/app/components/NavBar";
import Dashboard from "@/app/components/Dashboard";
import { jakartasmall } from "@/app/utils/fonts";
import FriendCard from "@/app/components/ui/FriendCard";

interface User {
  name: string;
  interests: string[];
  friends: string[];
}

interface Friend {
  id?: string;
  name: string;
  interests: string[];
}

function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myfriends, setmyFriends] = useState<Friend[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentView, setCurrentView] = useState<"explore" | "friends">("explore");
  const [showMyFriends, setShowMyFriends] = useState(false);

  const getUserById = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data() as User;
        console.log("User fetched", userData);
        setUser(userData);
        if (showMyFriends) {
          fetchUserFriends(userData.friends);
        } else {
          fetchSimilarUsers(userData);
        }
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

      if (
        Array.isArray(similar_users) &&
        similar_users.every(
          (user) =>
            Array.isArray(user) && typeof user[0] === "string" && Array.isArray(user[1])
        )
      ) {
        const formattedFriends = similar_users
          .map(([name, interests]) => ({ name, interests }))
          .filter((friend) => friend.name !== user.name);
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
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          interests: doc.data().interests
        }))
        .filter((user) => user.name !== currentUserName);

      const shuffled = allUsers.sort(() => 0.5 - Math.random());
      const randomUsers = shuffled.slice(0, 5);

      setFriends(randomUsers);
    } catch (error) {
      console.error("Error fetching random users:", error);
    }
  };

  const fetchUserFriends = async (friendIds: string[]) => {
    try {
      if (user) {
        setmyFriends(user.friends.map((friend) => ({ name: friend, interests: [] })));
      }
    } catch (error) {
      console.error("Error fetching user friends:", error);
    }
  };

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("userId"))
      ?.split("=")?.[1];

    if (cookieValue) {
      setCurrentUserId(cookieValue);
      getUserById(cookieValue).then((userData) => {
        if (userData) {
          fetchSimilarUsers(userData);
        }
      });
    } else {
      console.error("User ID not found in cookie");
    }
  }, [currentUserId]);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("userId"))
      ?.split("=")?.[1];

    if (cookieValue) {
      setCurrentUserId(cookieValue);
      getUserById(cookieValue).then((userData) => {
        if (userData) {
          if (currentView === "friends") {
            fetchUserFriends(userData.friends);
          }
        }
      });
    } else {
      console.error("User ID not found in cookie");
    }
  }, [currentView]);

  const handleAddFriend = () => {
    if (currentUserId) {
      getUserById(currentUserId);
    }
  };

  const toggleFriendsView = () => {
    setShowMyFriends(!showMyFriends);
  };

  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center justify-between bg-[#ebebeb] p-[10px] ${jakartasmall.className}`}
    >
      <NavBar />
      <div className="flex w-full justify-between p-10">
        {user && (
          <Dashboard
            user={user}
            currentView={currentView}
            setCurrentView={setCurrentView}
          />
        )}
        <div className="w-[40vw] rounded-lg bg-white p-5">
          <h1 className="mb-5 text-[2vw]">
            {currentView === "explore" ? "Explore" : "Friends"}
          </h1>
          {currentView !== "explore" ? (
            <div className="grid grid-cols-2 gap-4">
              {myfriends.map((friend, index) => (
                <FriendCard
                  key={friend.id || index}
                  friend={friend}
                  currentUserId={currentUserId}
                  onAddFriend={handleAddFriend}
                  showAddButton={false}
                />
              ))}
            </div>
          ) : (
            <div></div>
          )}
        </div>
        <div className="h-[80vh] w-[20vw] overflow-y-scroll rounded-lg bg-white p-5">
          <h1 className="p-5 text-[2vw]">Add Friends</h1>
          <div className="flex w-full flex-col items-center justify-center gap-4">
            {friends.map((friend, index) => (
              <FriendCard
                key={friend.id || index}
                friend={friend}
                currentUserId={currentUserId}
                onAddFriend={handleAddFriend}
                showAddButton={true}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
