import React, { useState, useEffect } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp, getDoc, query, where, getDocs } from "firebase/firestore";


import { db } from "../../lib/firebaseConfig";
import { RiAddFill, RiCloseLine } from "react-icons/ri";

interface Friend {
  id?: string;  
  name: string;
  interests: string[];
}
interface FriendCardProps {
  friend: Friend;
  currentUserId: string;
  showAddButton: boolean;
  onAddFriend: () => void;
  onRemoveFriend: () => void;
  prevColor?: string;
}

const colors = [
  "bg-red-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-yellow-200",
  "bg-purple-200",
  "bg-pink-200",
  "bg-indigo-200",
  "bg-teal-200"
];

function FriendCard({
  friend,
  currentUserId,
  showAddButton,
  onAddFriend,
  onRemoveFriend,
  prevColor
}: FriendCardProps) {
  const [profileColor, setProfileColor] = useState<string>("");

  useEffect(() => {
    setProfileColor(getRandomColor(prevColor));
  }, [prevColor]);

 
  const addFriend = async () => {
    if (!currentUserId) {
      alert("User ID is missing. Please log in again.");
      return;
    }
  
    try {
     
      const currentUserRef = doc(db, "users", currentUserId);
      await updateDoc(currentUserRef, {
        friends: arrayUnion(friend.name)
      });
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("name", "==", friend.name));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error("Friend's user document not found");
      }
      
      const friendDoc = querySnapshot.docs[0];
      const friendId = friendDoc.id;
  
      // Create a new chat document
      const newChatRef = await addDoc(collection(db, "chats"), {
        participants: [currentUserId, friendId],
        createdAt: serverTimestamp(),
        lastMessage: {
          content: "",
          senderId: "",
          timestamp: serverTimestamp()
        },
        type: "private"
      });

      await updateDoc(currentUserRef, {
        chats: arrayUnion(newChatRef.id)
      });
  
      const friendUserRef = doc(db, "users", friendId);
      await updateDoc(friendUserRef, {
        chats: arrayUnion(newChatRef.id)
      });
  
  
      alert(`${friend.name} added to your friends list and chat created!`);
      onAddFriend();
    } catch (error) {
      console.error("Error adding friend or creating chat:", error);
      alert(`Failed to add friend or create chat: ${(error as Error).message}`);
    }
  };

  const removeFriend = async () => {
    if (!currentUserId) {
      alert("User ID is missing. Please log in again.");
      return;
    }

    try {
      const userRef = doc(db, "users", currentUserId);
      await updateDoc(userRef, {
        friends: arrayRemove(friend.name)
      });
      alert(`${friend.name} removed from your friends list!`);
      onRemoveFriend();
    } catch (error) {
      console.error("Error removing friend:", error);
      alert(`Failed to remove friend: ${(error as Error).message}`);
    }
  };

  const getRandomColor = (prevColor?: string) => {
    let availableColors = colors.filter((color) => color !== prevColor);
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  };

  return (
    <>
  {friend.name &&(
    <div className="flex h-fit w-full max-w-md rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-lg">
    <div className="flex w-full items-center justify-between p-4">
      <div className="flex w-full items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${profileColor} text-lg font-semibold`}
        >
          {friend?.name[0].toUpperCase()}
        </div>
        <div className="flex w-[75%] flex-col justify-start">
          <h1 className="text-[14px] font-medium">{friend.name}</h1>
          {friend.interests && friend.interests.length > 0 ? (
            <h2 className="text-[10px] text-gray-600">
              Interests:{" "}
              {friend.interests.join(", ").length > 60
                ? `${friend.interests.join(", ").slice(0, 60)}...`
                : friend.interests.join(", ")}
            </h2>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-center">
        {showAddButton ? (
          <button
            onClick={addFriend}
            className="rounded-full bg-blue-500 p-2 text-white transition-colors duration-300 hover:bg-blue-600"
            aria-label="Add friend"
          >
            <RiAddFill size={20} />
          </button>
        ) : (
          <button
            onClick={removeFriend}
            className="rounded-full bg-red-500 p-2 text-white transition-colors duration-300 hover:bg-red-600"
            aria-label="Remove friend"
          >
            <RiCloseLine size={20} />
          </button>
        )}
      </div>
    </div>
  </div>
  )}
  </>
  );
  
}

export default FriendCard;
