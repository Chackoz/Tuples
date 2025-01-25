"use client";
import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { RiUserAddLine, RiUserUnfollowLine } from "react-icons/ri";
import { User } from "@/app/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

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
  "bg-red-200", "bg-blue-200", "bg-green-200", "bg-yellow-200", 
  "bg-purple-200", "bg-pink-200", "bg-indigo-200", "bg-teal-200"
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
  const [requestStatus, setRequestStatus] = useState<'none' | 'sent' | 'received' | 'pending'>('none');
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const navigateToProfile = () => {
    if (friend.id) {
      router.push(`/profile?id=${friend.id}`);
    }
  };

  useEffect(() => {
    setProfileColor(getRandomColor(prevColor));
    checkFriendRequestStatus();
    getUserById(currentUserId);
  }, [prevColor, currentUserId, friend.id]);

  const getRandomColor = (prevColor?: string) => {
    let availableColors = colors.filter((color) => color !== prevColor);
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  };

  const checkFriendRequestStatus = async () => {
    if (!currentUserId || !friend.id) return;

    try {
      // Check if a request was sent from current user to friend
      const sentRequestRef = doc(db, "friendRequests", `${currentUserId}_${friend.id}`);
      const sentRequestSnap = await getDoc(sentRequestRef);

      // Check if a request was sent from friend to current user
      const receivedRequestRef = doc(db, "friendRequests", `${friend.id}_${currentUserId}`);
      const receivedRequestSnap = await getDoc(receivedRequestRef);

      if (sentRequestSnap.exists()) {
        setRequestStatus('sent');
      } else if (receivedRequestSnap.exists()) {
        setRequestStatus('received');
      } else {
        setRequestStatus('none');
      }
    } catch (error) {
      console.error("Error checking friend request status:", error);
    }
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
        toast({
          title: "Error",
          description: "Document does not exist!",
          variant: "destructive"
        });
        setstate(!state);
        return null;
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      toast({
        title: "Error",
        description: `Failed to fetch user: ${(error as Error).message}`,
        variant: "destructive"
      });
      return null;
    }
  }, []);

  const sendFriendRequest = async () => {
    if (!currentUserId || !friend.id) {
      toast({
        title: "Error",
        description: "User ID is missing. Please log in again.",
        variant: "destructive"
      });
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
      setRequestStatus('sent');
      toast({
        title: "Success",
        description: `Friend request sent to ${friend.name}!`
      });

      onRequestSent();
      setstate(!state);
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({
        title: "Error",
        description: `Failed to send friend request: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };

  const acceptFriendRequest = async () => {
    if (!currentUserId || !friend.id) {
      toast({
        title: "Error",
        description: "User ID is missing. Please log in again.",
        variant: "destructive"
      });
      return;
    }

    try {
      const requestRef = doc(db, "friendRequests", `${friend.id}_${currentUserId}`);
      
      // Update friends list for both users
      const currentUserRef = doc(db, "users", currentUserId);
      const friendUserRef = doc(db, "users", friend.id);

      await updateDoc(currentUserRef, {
        friends: arrayUnion(friend.name)
      });

      await updateDoc(friendUserRef, {
        friends: arrayUnion(user?.name)
      });

      // Delete the friend request
      await deleteDoc(requestRef);

      setRequestStatus('none');
      toast({
        title: "Success",
        description: `You are now friends with ${friend.name}!`
      });

      setstate(!state);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast({
        title: "Error",
        description: `Failed to accept friend request: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };

  const cancelFriendRequest = async () => {
    if (!currentUserId || !friend.id) {
      toast({
        title: "Error",
        description: "User ID is missing. Please log in again.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Try to delete request from current user to friend
      const sentRequestRef = doc(db, "friendRequests", `${currentUserId}_${friend.id}`);
      
      // Also try to delete request from friend to current user
      const receivedRequestRef = doc(db, "friendRequests", `${friend.id}_${currentUserId}`);

      // Delete both possible request documents
      await Promise.all([
        deleteDoc(sentRequestRef),
        deleteDoc(receivedRequestRef)
      ]);

      setRequestStatus('none');
      toast({
        title: "Request Cancelled",
        description: `Friend request with ${friend.name} cancelled!`
      });
      onRequestCancelled();
      setstate(!state);
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast({
        title: "Error",
        description: `Failed to cancel friend request: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };

  const removeFriend = async () => {
    if (!currentUserId || !friend.id) {
      toast({
        title: "Error",
        description: "User ID is missing. Please log in again.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Find and delete the chat between the two users
      const chatsRef = collection(db, "chats");
      const userChatsQuery = query(
        chatsRef,
        where("participants", "array-contains", currentUserId),
        where("type", "==", "private")
      );
      const userChatsSnapshot = await getDocs(userChatsQuery);

      const chatToDelete = userChatsSnapshot.docs.find((chatDoc) => {
        const participants = chatDoc.data().participants;
        return participants.includes(friend.id);
      });

      if (chatToDelete) {
        // Delete the specific chat document
        await deleteDoc(doc(db, "chats", chatToDelete.id));

        // Remove chat reference from both users
        const currentUserRef = doc(db, "users", currentUserId);
        const friendUserRef = doc(db, "users", friend.id);

        await updateDoc(currentUserRef, {
          friends: arrayRemove(friend.name),
          chats: arrayRemove(chatToDelete.id)
        });

        await updateDoc(friendUserRef, {
          friends: arrayRemove(user?.name),
          chats: arrayRemove(chatToDelete.id)
        });
      } else {
        // Fallback if no chat found - just remove from friends list
        const currentUserRef = doc(db, "users", currentUserId);
        const friendUserRef = doc(db, "users", friend.id);

        await updateDoc(currentUserRef, {
          friends: arrayRemove(friend.name)
        });

        await updateDoc(friendUserRef, {
          friends: arrayRemove(user?.name)
        });
      }

      toast({
        title: "Friend Removed",
        description: `${friend.name} has been removed from your friends list.`
      });
      setstate(!state);
    } catch (error) {
      console.error("Error removing friend:", error);
      toast({
        title: "Error",
        description: `Failed to remove friend: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };

  const renderProfilePicture = () => {
    if (friend.profilePicUrl) {
      return (
        <Image
          src={friend.profilePicUrl}
          alt={`${friend.name}'s profile`}
          width={48}
          height={48}
          className="h-[40px] w-[40px] rounded-full object-cover md:h-[50px] md:w-[50px] "
        />
      );
    }

    return (
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${profileColor} text-lg font-semibold`}
      >
        <Image
          src={friend.profilePicUrl || "/logo.png"}
          alt={`${friend.name[0]}`}
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
            <div 
              onClick={navigateToProfile} 
              className="flex w-full items-center gap-4 cursor-pointer"
            >
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
              {isFriend ? (
                <button
                  onClick={removeFriend}
                  className="rounded-full bg-red-500 p-2 text-white transition-colors duration-300 hover:bg-red-600"
                  aria-label="Remove friend"
                >
                  <RiUserUnfollowLine size={20} />
                </button>
              ) : requestStatus === 'none' && showAddButton ? (
                <button
                  onClick={sendFriendRequest}
                  className="rounded-full bg-blue-500 p-2 text-white transition-colors duration-300 hover:bg-blue-600"
                  aria-label="Send friend request"
                >
                  <RiUserAddLine size={20} />
                </button>
              ) : requestStatus === 'sent' ? (
                <button
                  onClick={cancelFriendRequest}
                  className="rounded-full bg-yellow-500 p-2 text-white transition-colors duration-300 hover:bg-yellow-600"
                  aria-label="Cancel friend request"
                >
                  <RiUserUnfollowLine size={20} />
                </button>
              ) : requestStatus === 'received' ? (
                <button
                  onClick={acceptFriendRequest}
                  className="rounded-full bg-green-500 p-2 text-white transition-colors duration-300 hover:bg-green-600"
                  aria-label="Accept friend request"
                >
                  <RiUserAddLine size={20} />
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