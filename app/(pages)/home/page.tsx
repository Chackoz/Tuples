"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  doc,
  updateDoc,
  arrayUnion,
  query,
  where,
  deleteDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  getDocs
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import axios from "axios";
import NavBar from "@/app/components/NavBar";
import Dashboard from "@/app/components/Dashboard";
import { jakartasmall } from "@/app/utils/fonts";
import FriendCard from "@/app/components/ui/FriendCard";
import Profile from "@/app/components/Profile";
import Communities from "@/app/components/Communities";
import ChatWindow from "@/app/components/ui/ChatWindow";
import {
  getUserById,
  fetchAllCommunities,
  handleJoinCommunity,
  handleRemoveFriend
} from "@/app/utils/dbUtils";



function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myFriends, setMyFriends] = useState<Friend[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentView, setCurrentView] = useState<string>("Explore");
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [state, setState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastApiCallTime, setLastApiCallTime] = useState<number>(0);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [ifUnread, setIfUnread] = useState(false);

  const unsubscribeFriendRequests = useRef<(() => void) | null>(null);

  const fetchSimilarUsers = useCallback(
    async (user: User) => {
      if (friends.length > 0) return; // Don't fetch if we already have friends

      try {
        const userInterests = user.interests.join(", ");
        const response = await axios.post("http://127.0.0.1:5000/api/similar_users", {
          user_interests: userInterests
        });

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
    },
    [friends]
  );



  const fetchRandomUsers = async (user: User) => {
    if (friends.length > 0) return; // Don't fetch if we already have friends

    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const allUsers = usersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          interests: doc.data().interests,
          userId: doc.data().userId
        }))
        .filter((u) => u.name !== user.name && !user.friends.includes(u.name));

      const shuffled = allUsers.sort(() => 0.5 - Math.random());
      const randomUsers = shuffled.slice(0, 5);

      setFriends(randomUsers);
    } catch (error) {
      console.error("Error fetching random users:", error);
    }
  };

  const fetchUserFriends = useCallback(
    async (friendNames: string[]) => {
      if (myFriends.length > 0) return; // Don't fetch if we already have friends

      try {
        const friendsData = await Promise.all(
          friendNames.map(async (name) => {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("name", "==", name));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const friendDoc = querySnapshot.docs[0];
              const data = friendDoc.data();
              return {
                id: friendDoc.id,
                name: data.name,
                interests: data.interests as string[],
                userId: data.userId
              } as Friend;
            }
            return null;
          })
        );

        const validFriends = friendsData.filter(
          (friend): friend is Friend => friend !== null
        );
        console.log("valid friends: ", validFriends);
        setMyFriends(validFriends);
      } catch (error) {
        console.error("Error fetching user friends:", error);
      }
    },
    [myFriends]
  );

  const setupFriendRequestListener = useCallback(() => {
    if (!currentUserId) return;

    const requestsRef = collection(db, "friendRequests");
    const q = query(
      requestsRef,
      where("to", "==", currentUserId),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const requests: FriendRequest[] = [];
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as FriendRequest);
      });
      setFriendRequests(requests);
    });

    unsubscribeFriendRequests.current = unsubscribe;
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

      // Update local state
      setUser((prevUser) => {
        if (prevUser) {
          return {
            ...prevUser,
            friends: [...prevUser.friends, request.name]
          };
        }
        return prevUser;
      });

      setMyFriends((prevFriends) => [
        ...prevFriends,
        { name: request.name, interests: [] }
      ]);
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleRejectFriendRequest = async (request: FriendRequest) => {
    try {
      const requestRef = doc(db, "friendRequests", request.id);
      await deleteDoc(requestRef);
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };


  const generateInsights = useCallback(
    async (interests: string[]) => {
      const currentTime = Date.now();
      if (currentTime - lastApiCallTime < 60000 || insights.length > 0) {
        console.log("API call skipped: rate limit or insights already generated.");
        return;
      }

      setLastApiCallTime(currentTime);
      setIsLoading(true);
      const API_KEY = process.env.GEMINI_API_KEY;
      const API_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

      try {
        const prompt = `Based on these interests: ${interests.join(
          ", "
        )}, generate 7 fun and thought-provoking insights about life. Each insight should have:

        1. A catchy title (bonus points for puns)
        2. A brief description that's both humorous and thought-provoking
        3. A fun challenge or action item related to the insight

        Format the response as a series of insights, separated by dashes (--):

        Title: [Insight Title]
        Description: [Insight Description]
        Challenge: [Related Challenge]

        ---

        Let's make it entertaining and insightful!`;

        const response = await axios.post(`${API_URL}?key=${API_KEY}`, {
          contents: [{ parts: [{ text: prompt }] }]
        });

        const generatedText = response.data.candidates[0].content.parts[0].text;

        const insightEntries = generatedText
          .split("---")
          .filter((entry: string) => entry.trim() !== "");
        const insightsData = insightEntries.map((entry: string) => {
          const lines = entry.trim().split("\n");
          return {
            title: lines[0].replace("Title: ", ""),
            description: lines[1].replace("Description: ", ""),
            challenge: lines[2]?.replace("Challenge: ", "")
          };
        });
        setInsights(insightsData);
      } catch (error) {
        console.error("Error generating insights:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [lastApiCallTime, insights]
  );

  
  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("userId"))
      ?.split("=")?.[1];

    if (cookieValue) {
      console.log("User ID found in cookie:", cookieValue);
      setCurrentUserId(cookieValue);
      getUserById(cookieValue);
    } else {
      console.error("User ID not found in cookie");
    }

    return () => {
      if (unsubscribeFriendRequests.current) {
        unsubscribeFriendRequests.current();
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserFriends(user.friends);
      fetchSimilarUsers(user);
      generateInsights(user.interests);
      setupFriendRequestListener();
    }
  }, [
    user,
    fetchUserFriends,
    fetchSimilarUsers,
    generateInsights,
    setupFriendRequestListener
  ]);

  useEffect(() => {
    if (currentView === "Communities") {
      fetchAllCommunities().then(setAllCommunities);
    }
  }, [currentView]);

  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center justify-between bg-[#ebebeb] p-[10px] ${jakartasmall.className} custom-scrollbar`}
    >
      <NavBar />
      <div className="flex w-full justify-between p-10">
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
          className={`${
            currentView === "Chat" ? "w-[70%]" : "w-[40vw]"
          } custom-scrollbar h-[80vh] overflow-y-auto rounded-lg bg-white p-5`}
        >
          <h1 className="mb-5 text-2xl font-bold">{currentView}</h1>
          {currentView === "Chat" && (
            <ChatWindow
              currentUserId={currentUserId}
              ifUnread={ifUnread}
              setifUnread={setIfUnread}
              state={state}
            />
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
          {currentView === "Explore" && (
            <>
              {isLoading
                ? Array(3)
                    .fill(null)
                    .map((_, index) => (
                      <div
                        key={index}
                        className="z-0 mb-8 animate-pulse rounded-lg bg-gray-100 p-4"
                      >
                        <div className="mb-2 h-6 w-3/4 rounded bg-gray-300"></div>
                        <div className="mb-4 h-4 w-full rounded bg-gray-300"></div>
                        <div className="mb-2 h-4 w-full rounded bg-gray-300"></div>
                        <div className="h-4 w-3/4 rounded bg-gray-300"></div>
                      </div>
                    ))
                : insights.map((insight, index) => (
                    <div key={index} className="mb-8 rounded-lg bg-gray-100 p-4">
                      <h3 className="mb-2 text-xl font-semibold">
                        {insight.title.replaceAll("**", "")}
                      </h3>
                      <p className="mb-4">{insight.description.replaceAll("**", "")}</p>
                      <div className="rounded bg-blue-100 p-3">
                        <h4 className="mb-1 font-semibold">Challenge:</h4>
                        <p>{insight.challenge.replaceAll("**", "")}</p>
                      </div>
                    </div>
                  ))}
            </>
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
          <div className="custom-scrollbar h-[80vh] w-[23vw] overflow-y-auto rounded-lg bg-white p-5">
            {currentView !== "Friends" && <h1 className="pb-5 text-2xl">Add Friends</h1>}
            {currentView === "Friends" && <h1 className="pb-5 text-2xl">My Friends</h1>}
            <div className="flex w-full flex-col items-center justify-center gap-4">
              {currentView === "Friends"
                ? myFriends.map((friend, index) => (
                    <FriendCard
                      key={friend.id || index}
                      friend={friend}
                      currentUserId={currentUserId}
                      onRequestSent={() => {
                        /* Handle request sent */
                      }}
                      onRequestCancelled={() => {
                        /* Handle request cancelled */
                      }}
                      showAddButton={false}
                      isFriend={true}
                      state={state}
                      setstate={setState}
                    />
                  ))
                : friends.map((friend, index) => (
                    <FriendCard
                      key={friend.id || index}
                      friend={friend}
                      currentUserId={currentUserId}
                      onRequestSent={() => {
                        /* Handle request sent */
                      }}
                      onRequestCancelled={() => {
                        /* Handle request cancelled */
                      }}
                      showAddButton={true}
                      isFriend={false}
                      state={state}
                      setstate={setState}
                    />
                  ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default Home;