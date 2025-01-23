import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { RiUserAddLine, RiUserUnfollowLine } from "react-icons/ri";
import { User } from "@/app/types";

interface Friend {
  name: string;
  interests: string[];
  id?: string;
  userId?: string;
  profilePicUrl?: string;
}

interface FriendCardProps {
  friend: Friend;
  currentUserId: string;
  showAddButton: boolean;
  onRequestSent: () => void;
  onRequestCancelled: () => void;
  prevColor?: string;
  isFriend: boolean;
  state: boolean;
  setstate: (view: boolean) => void;
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
  onRequestSent,
  onRequestCancelled,
  prevColor,
  isFriend,
  state,
  setstate
}: FriendCardProps) {
  const [profileColor, setProfileColor] = useState<string>("");
  const [isPending, setIsPending] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setProfileColor(getRandomColor(prevColor));
    checkPendingRequest();
    getUserById(currentUserId);
  }, [prevColor, currentUserId, friend.id]);

  const getRandomColor = (prevColor?: string) => {
    let availableColors = colors.filter((color) => color !== prevColor);
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  };

  const checkPendingRequest = async () => {
    if (!currentUserId || !friend.id) return;

    const requestRef = doc(db, "friendRequests", `${currentUserId}_${friend.id}`);
    const requestSnap = await getDoc(requestRef);
    setIsPending(requestSnap.exists());
  };

  const getUserById = useCallback(async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data() as User;
        setUser(userData);
        return userData;
      } else {
        console.log("Document does not exist!");
        setstate(!state);
        return null;
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }, []);

  const sendFriendRequest = async () => {
    if (!currentUserId || !friend.id) {
      alert("User ID is missing. Please log in again.");
      return;
    }

    try {
      const requestRef = doc(db, "friendRequests", `${currentUserId}_${friend.id}`);
      await setDoc(requestRef, {
        from: currentUserId,
        to: friend.id,
        status: "pending",
        name: user?.name,
        toname: friend.name
      });
      setIsPending(true);
      alert(`Friend request sent to ${friend.name}!`);
      onRequestSent();
      setstate(!state);
    } catch (error) {
      console.error("Error sending friend request:", error);
      alert(`Failed to send friend request: ${(error as Error).message}`);
    }
  };

  const cancelFriendRequest = async () => {
    if (!currentUserId || !friend.id) {
      alert("User ID is missing. Please log in again.");
      return;
    }

    try {
      const requestRef = doc(db, "friendRequests", `${currentUserId}_${friend.id}`);
      await deleteDoc(requestRef);
      setIsPending(false);
      alert(`Friend request to ${friend.name} cancelled!`);
      onRequestCancelled();
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      alert(`Failed to cancel friend request: ${(error as Error).message}`);
    }
    setstate(!state);
  };

  const removeFriend = async () => {
    if (!currentUserId || !friend.id) {
      alert("User ID is missing. Please log in again.");
      return;
    }

    try {
      // Remove friend from current user's friends list
      const userRef = doc(db, "users", currentUserId);
      await updateDoc(userRef, {
        friends: arrayRemove(friend.name)
      });

      // Remove current user from friend's friends list
      const friendRef = doc(db, "users", friend.id);
      await updateDoc(friendRef, {
        friends: arrayRemove(user?.name)
      });

      alert(`${friend.name} has been removed from your friends list.`);
      setstate(!state);
    } catch (error) {
      console.error("Error removing friend:", error);
      alert(`Failed to remove friend: ${(error as Error).message}`);
    }
  };

  const renderProfilePicture = () => {
    if (friend.profilePicUrl) {
      console.log();
      return (
        <Image
          src={friend.profilePicUrl}
          alt={`${friend.name}'s profile`}
          width={48}
          height={48}
          className="rounded-full object-cover"
        />
      );
    }

    return (
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${profileColor} text-lg font-semibold`}
      >
        <Image
          src={friend.profilePicUrl || ""}
          alt={`${friend.name}'s profile`}
          width={48}
          height={48}
          className="rounded-full object-cover"
        />
      </div>
    );
  };

  return (
    <>
      {friend.name && (
        <div className="flex h-fit w-full max-w-md rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-lg">
          <div className="flex w-full items-center justify-between p-4">
            <div className="flex w-full items-center gap-4">
              {renderProfilePicture()}
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
              {/* Existing button logic remains the same */}
              {isFriend ? (
                <button
                  onClick={removeFriend}
                  className="rounded-full bg-red-500 p-2 text-white transition-colors duration-300 hover:bg-red-600"
                  aria-label="Remove friend"
                >
                  <RiUserUnfollowLine size={20} />
                </button>
              ) : showAddButton && !isPending ? (
                <button
                  onClick={sendFriendRequest}
                  className="rounded-full bg-blue-500 p-2 text-white transition-colors duration-300 hover:bg-blue-600"
                  aria-label="Send friend request"
                >
                  <RiUserAddLine size={20} />
                </button>
              ) : isPending ? (
                <button
                  onClick={cancelFriendRequest}
                  className="rounded-full bg-yellow-500 p-2 text-white transition-colors duration-300 hover:bg-yellow-600"
                  aria-label="Cancel friend request"
                >
                  <RiUserUnfollowLine size={20} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FriendCard;
