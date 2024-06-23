"use client";

import React, { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  arrayRemove,
  arrayUnion
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import axios from "axios";
import NavBar from "@/app/components/NavBar";
import Dashboard from "@/app/components/Dashboard";
import { jakartasmall } from "@/app/utils/fonts";
import FriendCard from "@/app/components/ui/FriendCard";
import Profile from "@/app/components/Profile"; // Import the new Profile component
import Communities from "@/app/components/Communities";
import FriendsList from "@/app/components/FriendsList";
import ChatWindow from "@/app/components/ui/ChatWindow";

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

interface Community {
  id: string;
  name: string;
  creator: string;
  members: string[];
  tags: string[];
}

function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myFriends, setMyFriends] = useState<Friend[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentView, setCurrentView] = useState<string>("Explore");
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [state, setstate] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const getUserById = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data() as User;
        console.log("User fetched", userData);
        setUser(userData);
        fetchSimilarUsers(userData);
        console.log("User Data is ",userData);
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
          .filter(
            (friend) => friend.name !== user.name && !user.friends.includes(friend.name)
          );
        setFriends(formattedFriends);
      } else {
        console.error("Invalid similar_users structure:", similar_users);
        await fetchRandomUsers(user);
      }
    } catch (error) {
      console.error("Error fetching similar users:", error);
      await fetchRandomUsers(user);
    }
  };

  const fetchRandomUsers = async (user: User) => {
    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const allUsers = usersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          interests: doc.data().interests
        }))
        .filter((u) => u.name !== user.name && !user.friends.includes(u.name));

      const shuffled = allUsers.sort(() => 0.5 - Math.random());
      const randomUsers = shuffled.slice(0, 5);

      setFriends(randomUsers);
    } catch (error) {
      console.error("Error fetching random users:", error);
    }
  };

  const fetchUserFriends = async (friendNames: string[]) => {
    try {
      const friendsData = friendNames.map((name) => ({ name, interests: [] }));
      setMyFriends(friendsData);
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
      console.log("User ID found in cookie:", cookieValue)
      setCurrentUserId(cookieValue);
      getUserById(cookieValue);
    } else {
      console.error("User ID not found in cookie");
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserFriends(user.friends);
      fetchSimilarUsers(user);
    }
  }, [user, currentView]);

  const handleAddFriend = () => {
    if (currentUserId) {
      getUserById(currentUserId);
    }
  };

  const fetchAllCommunities = async () => {
    try {
      const communitiesRef = collection(db, "communities");
      const querySnapshot = await getDocs(communitiesRef);
      const communitiesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Community[];
      setAllCommunities(communitiesData);
    } catch (error) {
      console.error("Error fetching communities:", error);
    }
  };

  useEffect(() => {
    if (currentView === "Communities") {
      fetchAllCommunities();
    }
  }, [currentView,state]);

  const handleRemoveFriend = async (friendName: string) => {
    if (!currentUserId || !user) {
      alert("User ID is missing. Please log in again.");
      return;
    }

    try {
      const userRef = doc(db, "users", currentUserId);
      await updateDoc(userRef, {
        friends: arrayRemove(friendName)
      });

      // Update local state
      setUser((prevUser) => {
        if (prevUser) {
          return {
            ...prevUser,
            friends: prevUser.friends.filter((friend) => friend !== friendName)
          };
        }
        return prevUser;
      });

      setMyFriends((prevFriends) =>
        prevFriends.filter((friend) => friend.name !== friendName)
      );

      console.log(`${friendName} removed from your friends list!`);
    } catch (error) {
      console.error("Error removing friend:", error);
      alert(`Failed to remove friend: ${(error as Error).message}`);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!currentUserId || !user) {
      alert("User ID is missing. Please log in again.");
      return;
    }

    try {
      const communityRef = doc(db, "communities", communityId);
      await updateDoc(communityRef, {
        members: arrayUnion(user.name)
      });

      // Update local state
      setAllCommunities((prevCommunities) =>
        prevCommunities.map((community) =>
          community.id === communityId
            ? { ...community, members: [...community.members, user.name] }
            : community
        )
      );

      console.log(`Joined community: ${communityId}`);
      setCurrentView("Communities");
      setstate(!state);
    } catch (error) {
      console.error("Error joining community:", error);
      alert(`Failed to join community: ${(error as Error).message}`);
    }
  };

  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center justify-between bg-[#ebebeb] p-[10px] ${jakartasmall.className}`}
    >
      <NavBar />
      <div className="flex w-full justify-between p-10">
        {user && (
          <Dashboard
            state={state}
            setstate={setstate}
            user={user}
            currentView={currentView}
            setCurrentView={setCurrentView}
          />
        )}
        <div className={` ${currentView === "Chat" ? 'w-[70%]' : 'w-[40vw]'} overflow-y-auto rounded-lg bg-white p-5`}>
          <h1 className="mb-5 text-2xl font-bold">{currentView}</h1>
          {currentView === "Chat" && (
            <ChatWindow
        currentUserId={currentUserId}
      />
)}
          {currentView === "Profile" && user &&   <Profile userId={currentUserId} />}
        
          {currentView === "Communities" && (
            <Communities
              allCommunities={allCommunities}
              user={user!}
              setAllCommunities={setAllCommunities}
              setstate={setstate}
              state={state}
            />
          )}
        </div>
       {
        currentView !== "Chat" && 
        <div className="h-[80vh] w-[23vw] overflow-y-auto rounded-lg bg-white p-5">
        {currentView !== "Friends" && <h1 className="pb-5 text-2xl ">Add Friends</h1>}
        {currentView === "Friends" && <h1 className="pb-5 text-2xl ">My Friends</h1>}
        <div className="flex w-full flex-col items-center justify-center gap-4 "></div>
        {currentView === "Friends" && myFriends.length > 1 && (
          <div className="flex w-full flex-col items-center justify-center gap-4 ">
            {myFriends.map((friend, index) => (
              <FriendCard
                key={friend.id || index}
                friend={friend}
                currentUserId={currentUserId}
                onAddFriend={handleAddFriend}
                onRemoveFriend={() => handleRemoveFriend(friend.name)}
                showAddButton={false}
              />
            ))}
          </div>
        )}
            
        {currentView !== "Friends" && (
          <div className="flex w-full flex-col items-center justify-center gap-4 ">
            {friends.map((friend, index) => (
              <FriendCard
                key={friend.id || index}
                friend={friend}
                currentUserId={currentUserId}
                onAddFriend={handleAddFriend}
                onRemoveFriend={() => handleRemoveFriend(friend.name)}
                showAddButton={true}
              />
            ))}
          </div>
        )}
      </div>
       }
      </div>
    </div>
  );
}

export default Home;
