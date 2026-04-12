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
        <div className="card-brutal flex h-fit w-full p-4 mb-2 cursor-pointer relative group">
          
          <div className="flex w-full items-center justify-between">
            <div 
              onClick={navigateToProfile} 
              className="flex w-[80%] items-center gap-4 cursor-pointer"
            >
              {friend.profilePicUrl ? (
                <Image
                  src={friend.profilePicUrl}
                  alt={`${friend.name}'s profile`}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-none border-2 border-black object-cover shadow-[2px_2px_0px_#3b82f6] shrink-0"
                />
              ) : (
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-none border-2 border-black shadow-[2px_2px_0px_#3b82f6] ${profileColor} shrink-0`}
                >
                  <span className="heading-brutal text-black text-xl">{friend.name[0]?.toUpperCase()}</span>
                </div>
              )}
              
              <div className="flex flex-col justify-start min-w-0 pr-2">
                <h1 className="subheading-brutal truncate text-base">{friend.name}</h1>
                {friend.interests && friend.interests.length > 0 ? (
                  <div className="flex gap-1 overflow-hidden mt-1">
                    {friend.interests.slice(0, 2).map((interest, index) => (
                      <span key={index} className="tag-brutal text-[9px] truncate max-w-[80px]">
                        {interest}
                      </span>
                    ))}
                    {friend.interests.length > 2 && (
                      <span className="tag-brutal text-[9px]">+{friend.interests.length - 2}</span>
                    )}
                  </div>
                ) : (
                  <p className="label-brutal text-black/50 mt-1">NO INTERESTS</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center shrink-0 z-10 relative">
              {isFriend ? (
                <button
                  onClick={removeFriend}
                  className="btn-secondary h-10 w-10 p-0 flex items-center justify-center"
                  aria-label="Remove friend"
                >
                  <RiUserUnfollowLine size={20} />
                </button>
              ) : requestStatus === 'none' && showAddButton ? (
                <button
                  onClick={sendFriendRequest}
                  className="btn-primary h-10 w-10 p-0 flex items-center justify-center bg-blue-500 hover:bg-blue-600 shadow-[2px_2px_0px_#000] text-white"
                  aria-label="Send friend request"
                >
                  <RiUserAddLine size={20} />
                </button>
              ) : requestStatus === 'sent' ? (
                <button
                  onClick={cancelFriendRequest}
                  className="btn-secondary h-10 w-10 p-0 flex items-center justify-center bg-black text-white hover:bg-gray-800"
                  aria-label="Cancel friend request"
                >
                  <RiUserUnfollowLine size={16} />
                </button>
              ) : requestStatus === 'received' ? (
                <button
                  onClick={acceptFriendRequest}
                  className="btn-primary h-10 w-10 p-0 flex items-center justify-center bg-green-500 text-white shadow-[2px_2px_0px_#000] hover:bg-green-600"
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