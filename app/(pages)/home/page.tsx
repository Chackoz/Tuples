"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  arrayUnion,
  query,
  where,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import NavBar from "@/app/components/NavBar";
import Dashboard from "@/app/components/Dashboard";
import FriendCard from "@/app/components/ui/FriendCard";
import Profile from "@/app/components/Profile";
import Communities from "@/app/components/Communities";
import ChatWindow from "@/app/components/ui/ChatWindow";
import { jakartasmall } from "@/app/utils/fonts";
import { Community, Friend, FriendRequest, User } from "@/app/types";
import { useRouter } from "next/navigation";
import { PostCreationModal, PostsList } from "@/app/components/FeedPosts";
import { useProject } from "@/app/hooks/useProject";
import { useFriends } from "@/app/hooks/useFriends";
import Projects from "@/app/components/ProjectSection";

function Home() {
  const router = useRouter();
  const { allProjects, fetchAllProjects } = useProject();
  const { friends, myFriends, refreshFriends } = useFriends();

  // State Hooks
  const [user, setUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentView, setCurrentView] = useState<string>("Explore");
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [state, setState] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [ifUnread, setIfUnread] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  const getUserById = useCallback(
    async (userId: string) => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnapshot = await getDoc(userRef);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data() as User;
          setUser(userData);
          await refreshFriends(userId, userData);
          return userData;
        } else {
          console.log("Document does not exist!");
          return null;
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    [refreshFriends]
  );

  const fetchAllCommunities = useCallback(async () => {
    try {
      const communitiesRef = collection(db, "communities");
      const q = query(communitiesRef, where("privateCommunity", "!=", true));
      const querySnapshot = await getDocs(q);
      const communitiesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Community[];
      setAllCommunities(communitiesData);
    } catch (error) {
      console.error("Error fetching communities:", error);
    }
  }, []);

  const fetchFriendRequests = useCallback(async () => {
    if (!currentUserId) return;
    const requestsRef = collection(db, "friendRequests");
    const q = query(
      requestsRef,
      where("to", "==", currentUserId),
      where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    const requests: FriendRequest[] = [];
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as FriendRequest);
    });
    setFriendRequests(requests);
  }, [currentUserId]);

  const handleAcceptFriendRequest = async (request: FriendRequest) => {
    try {
      const userRef = doc(db, "users", currentUserId);
      await updateDoc(userRef, {
        friends: arrayUnion(request.name)
      });
      const friendUserRef = doc(db, "users", request.from);
      await updateDoc(friendUserRef, {
        friends: arrayUnion(request.toname)
      });
      const requestRef = doc(db, "friendRequests", request.id);
      await updateDoc(requestRef, {
        status: "accepted"
      });
      await deleteDoc(requestRef);

      // Create a new chat document
      const newChatRef = await addDoc(collection(db, "chats"), {
        participants: [currentUserId, request.from],
        createdAt: serverTimestamp(),
        lastMessage: {
          content: "",
          senderId: "",
          timestamp: serverTimestamp()
        },
        type: "private"
      });

      const currentUserRef = doc(db, "users", currentUserId);
      await updateDoc(currentUserRef, {
        chats: arrayUnion(newChatRef.id)
      });
      const friendUserRef1 = doc(db, "users", request.from);
      await updateDoc(friendUserRef1, {
        chats: arrayUnion(newChatRef.id)
      });
      setState((prev) => !prev);
      await fetchFriendRequests();
      await getUserById(currentUserId);
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleRejectFriendRequest = async (request: FriendRequest) => {
    try {
      const requestRef = doc(db, "friendRequests", request.id);
      await updateDoc(requestRef, {
        status: "rejected"
      });
      await deleteDoc(requestRef);
      setState((prev) => !prev);
      await fetchFriendRequests();
    } catch (error) {
      console.error("Error rejecting friend request:", error);
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
      router.push("/login");
    }
  }, [getUserById, router]);

  useEffect(() => {
    if (currentView === "Communities") {
      fetchAllCommunities();
    }
    if (currentView === "Projects") {
      fetchAllProjects();
    }
    if (currentView === "Friends") {
      fetchFriendRequests();
    }
  }, [currentView, state, fetchAllCommunities, fetchAllProjects]);

 

  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center justify-between bg-[#ebebeb] p-[5px] md:p-[10px] ${jakartasmall.className} custom-scrollbar`}
    >
      <NavBar />

      <div className="flex w-full flex-col justify-between p-4 md:flex-row md:p-10">
        {user && (
          <Dashboard
            state={state}
            setstate={setState}
            user={user}
            currentView={currentView}
            setCurrentView={setCurrentView}
            currentUserId={currentUserId}
            ifUnread={ifUnread}
          />
        )}
        <div
          className={`${currentView === "Chat" ? "md:w-[70%]" : "md:w-[40vw]"} custom-scrollbar h-[80vh] overflow-y-auto rounded-lg bg-white p-2 md:p-5`}
        >
          <h1 className="mb-5 text-2xl font-bold">{currentView}</h1>
          {currentView === "Chat" && (
            <ChatWindow currentUserId={currentUserId} setIfUnread={setIfUnread} />
          )}
          {currentView === "Profile" && user && <Profile userId={currentUserId} />}
          {currentView === "Communities" && (
            <Communities
              allCommunities={allCommunities}
              user={user!}
              setAllCommunities={setAllCommunities}
              setstate={setState}
              state={state}
              currentUserId={currentUserId}
            />
          )}
          {currentView === "Projects" && user && (
            <Projects
              allProjects={allProjects}
              user={user}
              currentUserId={currentUserId}
              fetchAllProjects={fetchAllProjects}
              setState={setState}
            />
          )}
          {currentView === "Explore" && user && (
            <div>
              <div className="mb-6 flex items-center justify-between p-2 md:p-0">
                <h2 className="text-2xl font-bold">Community Posts</h2>
                <button
                  onClick={() => setIsPostModalOpen(true)}
                  className="md:text-md rounded bg-blue-500 px-4 py-2 text-xs text-white "
                >
                  Create New Post
                </button>
              </div>

              <PostCreationModal
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                userId={currentUserId}
                userName={user.name}
                userInterests={user.interests}
              />

              <PostsList userId={currentUserId} userInterests={user.interests} />
            </div>
          )}

          {currentView === "Friends" && (
            <div className="w-full">
              <h2 className="mb-4 text-xl font-bold">Friend Requests</h2>
              {friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="mb-4 flex items-center justify-between rounded-lg bg-white p-4 shadow-md"
                >
                  <span>{request.name}</span>
                  <div>
                    <button
                      onClick={() => handleAcceptFriendRequest(request)}
                      className="mr-2 rounded bg-green-500 px-4 py-2 text-white"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectFriendRequest(request)}
                      className="rounded bg-red-500 px-4 py-2 text-white"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {currentView !== "Chat" && (
          <div className="custom-scrollbar mt-5 hidden h-[80vh] overflow-y-auto rounded-lg bg-white p-5 md:mt-0 md:block md:w-[23vw]">
            {currentView !== "Friends" && <h1 className="pb-5 text-2xl ">Suggested Friends</h1>}
            {currentView === "Friends" && <h1 className="pb-5 text-2xl">My Friends</h1>}
            <div className="flex w-full flex-col items-center justify-center gap-4 "></div>
            {currentView === "Friends" && myFriends.length >= 0 && (
              <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 ">
                {myFriends.map((friend, index) => (
                  <FriendCard
                    key={friend.id || index}
                    friend={friend}
                    currentUserId={currentUserId}
                    onRequestSent={() => {}}
                    onRequestCancelled={() => {}}
                    showAddButton={false}
                    isFriend={true}
                    state={state}
                    setstate={setState}
                  />
                ))}
              </div>
            )}
            {currentView !== "Friends" && (
              <div className="flex w-full flex-col items-center justify-center gap-4">
                {friends.map((friend, index) => (
                  <FriendCard
                    key={friend.id || index}
                    friend={friend}
                    currentUserId={currentUserId}
                    onRequestSent={() => {}}
                    onRequestCancelled={() => {}}
                    showAddButton={true}
                    isFriend={false}
                    state={state}
                    setstate={setState}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
