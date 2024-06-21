import React from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

interface Friend {
  name: string;
  interests: string[];
}

function FriendCard({
  friend,
  currentUserId,
  showAddButton,
  onAddFriend
}: {
  friend: Friend;
  currentUserId: string;
  showAddButton: boolean;
  onAddFriend: () => void;
}) {
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
        {showAddButton && (
          <button
            onClick={addFriend}
            className="mt-2 rounded-lg bg-blue-500 p-2 text-white"
          >
            Add Friend
          </button>
        )}
      </div>
    </div>
  );
}

export default FriendCard;
