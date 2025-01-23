"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
import axios from "axios";
import { db } from "../../lib/firebaseConfig";

// Components
import NavBar from "@/app/components/NavBar";
import Dashboard from "@/app/components/Dashboard";
import FriendCard from "@/app/components/ui/FriendCard";
import Profile from "@/app/components/Profile";
import Communities from "@/app/components/Communities";
import ChatWindow from "@/app/components/ui/ChatWindow";

// Utilities
import { jakartasmall } from "@/app/utils/fonts";

// Types
import { Community, Friend, FriendRequest, Insight, Project, User } from "@/app/types";
import ProjectCreationModal from "@/app/components/ui/CreateProjectModal";

// Utility Functions
const debouncedFetch = (
  lastFetchTime: number,
  setLastFetchTime: React.Dispatch<React.SetStateAction<number>>,
  fetchFunction: () => Promise<void>,
  fetchTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
) => {
  const currentTime = Date.now();
  if (currentTime - lastFetchTime < 60000) {
    console.log("Fetch call skipped to respect rate limit.");
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(
      () => {
        fetchFunction();
        setLastFetchTime(Date.now());
      },
      30000 - (currentTime - lastFetchTime)
    );
  } else {
    fetchFunction();
    setLastFetchTime(currentTime);
  }
};

function Home() {
  // State Hooks
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
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Fetch All Projects
  const fetchAllProjects = useCallback(async () => {
    try {
      const projectsRef = collection(db, "projects");
      const q = query(projectsRef);
      const querySnapshot = await getDocs(q);

      const projectsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];

      setAllProjects(projectsData);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, []);

  // Fetch User's Projects
  const fetchUserProjects = useCallback(async (userId: string) => {
    try {
      const projectsRef = collection(db, "projects");
      const q = query(projectsRef, where("members", "array-contains", userId));
      const querySnapshot = await getDocs(q);

      const userProjectsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];

      setUserProjects(userProjectsData);
    } catch (error) {
      console.error("Error fetching user projects:", error);
    }
  }, []);

  // Join Project
  const handleJoinProject = async (projectId: string) => {
    if (!currentUserId || !user) {
      alert("User ID is missing. Please log in again.");
      return;
    }

    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        members: arrayUnion(user.name)
      });

      setAllProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id === projectId
            ? { ...project, members: [...project.members, user.name] }
            : project
        )
      );

      fetchUserProjects(currentUserId);
    } catch (error) {
      console.error("Error joining project:", error);
    }
  };

  // Fetch User by ID
  const getUserById = useCallback(async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data() as User;
        setUser(userData);
        await fetchSimilarUsers(userData);
        return userData;
      } else {
        console.log("Document does not exist!");
        return null;
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }, []);

  // Fetch Similar Users (Primary Method)
  const fetchSimilarUsers = useCallback(
    async (user: User) => {
      const fetchMethod = async () => {
        try {
          const userInterests = user.interests.join(", ");
          const response = await axios.post("http://10.40.9.104:5000/api/similar_users", {
            user_interests: userInterests
          });

          const { similar_users } = response.data;

          if (
            Array.isArray(similar_users) &&
            similar_users.every(
              (user) =>
                typeof user.name === "string" &&
                Array.isArray(user.interests) &&
                typeof user.userId === "string" &&
                typeof user.id === "string"
            )
          ) {
            const formattedFriends = similar_users
              .map(({ id, name, interests, userId }) => ({ id, name, interests, userId }))
              .filter(
                (friend) =>
                  friend.name !== user.name && !user.friends.includes(friend.name)
              );
            setFriends(formattedFriends);
            console.log(
              "Similar users fetched successfully:",
              formattedFriends,
              "Time",
              Date.now()
            );
          } else {
            console.error("Invalid similar_users structure:", similar_users);
            await fetchRandomUsers(user);
          }
        } catch (error) {
          console.error("Error fetching similar users:", error);
          await fetchRandomUsers(user);
          await fetchSimilarUsersGemini(user);
        }
      };

      debouncedFetch(lastFetchTime, setLastFetchTime, fetchMethod, fetchTimeoutRef);
    },
    [lastFetchTime]
  );

  // Fetch Similar Users (Gemini Fallback)
  const fetchSimilarUsersGemini = useCallback(
    async (user: User) => {
      const fetchMethod = async () => {
        try {
          const usersRef = collection(db, "users");
          const usersSnapshot = await getDocs(usersRef);
          const allUsers = usersSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              name: doc.data().name,
              interests: doc.data().interests,
              userId: doc.data().userId,
              profilePicUrl: doc.data().profilePicUrl
            }))
            .filter((u) => u.name !== user.name && !user.friends.includes(u.name));

          const userInterests = user.interests.join(", ");
          const allUsersData = allUsers
            .map((u) => `${u.name}: ${u.interests.join(", ")}`)
            .join("\n");

          const API_KEY = process.env.GEMINI_API_KEY;
          const API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

          const prompt = `Given the following user interests: ${userInterests}, and the list of other users with their interests:
  
        ${allUsersData}
  
        Rank the top 5 most similar users based on their interests. Return the results in the following format
  
        1. [User Name]
        2. [User Name]
        3. [User Name]
        4. [User Name]
        5. [User Name]
  
        Only include the names in your response(no formatting the name), no additional text.`;

          const response = await axios.post(`${API_URL}?key=${API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }]
          });

          const generatedText = response.data.candidates[0].content.parts[0].text;
          const similarUserNames = generatedText
            .split("\n")
            .map((line: string) => line.split(". ")[1].trim());

          const similarUsers = similarUserNames
            .map((name: any) => allUsers.find((u) => u.name === name))
            .filter((user: Friend): user is Friend => user !== undefined)
            .map(
              (user: {
                id: any;
                name: any;
                interests: any;
                userId: any;
                profilePicUrl: any;
              }) => ({
                id: user.id,
                name: user.name,
                interests: user.interests,
                userId: user.userId,
                profilePicUrl: user.profilePicUrl
              })
            );

          setFriends(similarUsers);
          console.log(
            "Similar users fetched successfully:",
            similarUsers,
            "Time",
            Date.now()
          );
        } catch (error) {
          console.error("Error fetching similar users:", error);
          await fetchRandomUsers(user);
        }
      };

      debouncedFetch(lastFetchTime, setLastFetchTime, fetchMethod, fetchTimeoutRef);
    },
    [lastFetchTime]
  );

  // Generate Insights
  const generateInsights = useCallback(
    async (interests: string[]) => {
      const currentTime = Date.now();
      if (currentTime - lastApiCallTime < 60000) {
        console.log("API call skipped to respect rate limit.");
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
        )}, generate 7 fun and thought-provoking daily challenges . Each challenge should have:

      1. A catchy title (bonus points for puns)
      2. A brief description that's both humorous and thought-provoking
      3. A fun challenge or action item related to the insight

      Format the response as a series of insights, separated by dashes (--):

      Title: [Insight Title]
      Description: [Insight Description]
      Challenge: [Related Challenge]

      ---
      choose interests randomly and make sure all fields get equal weightage ,
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
    [lastApiCallTime]
  );

  // Fetch Random Users
  const fetchRandomUsers = async (user: User) => {
    try {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const allUsers = usersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          interests: doc.data().interests,
          userId: doc.data().userId,
          profilePicUrl: doc.data().profilePicUrl
        }))
        .filter((u) => u.name !== user.name && !user.friends.includes(u.name));

      const shuffled = allUsers.sort(() => 0.5 - Math.random());
      const randomUsers = shuffled.slice(0, 5);

      setFriends(randomUsers);
    } catch (error) {
      console.error("Error fetching random users:", error);
    }
  };

  // Fetch User's Friends
  const fetchUserFriends = useCallback(async (friendNames: string[]) => {
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
              userId: data.userId,
              profilePicUrl: data.profilePicUrl
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
  }, []);

  // Fetch All Communities
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

  // Join Community
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

      setAllCommunities((prevCommunities) =>
        prevCommunities.map((community) =>
          community.id === communityId
            ? { ...community, members: [...community.members, user.name] }
            : community
        )
      );

      console.log(`Joined community: ${communityId}`);
      setCurrentView("Communities");
      setState(!state);
    } catch (error) {
      console.error("Error joining community:", error);
      alert(`Failed to join community: ${(error as Error).message}`);
    }
  };

  // Fetch Friend Requests
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

      fetchFriendRequests();
      getUserById(currentUserId);
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  // Reject Friend Request
  const handleRejectFriendRequest = async (request: FriendRequest) => {
    try {
      const requestRef = doc(db, "friendRequests", request.id);
      await updateDoc(requestRef, {
        status: "rejected"
      });
      await deleteDoc(requestRef);
      fetchFriendRequests();
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  // User Effect for Initial User Fetch
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
  }, [getUserById]);

  // User Effect for User-related Fetches
  useEffect(() => {
    if (user) {
      fetchUserFriends(user.friends);
      fetchSimilarUsers(user);
      generateInsights(user.interests);
      fetchFriendRequests();
      fetchUserProjects(currentUserId);
    }
  }, [
    user,
    currentView,
    fetchUserFriends,
    generateInsights,
    fetchFriendRequests,
    fetchUserProjects
  ]);

  // User Effect for Communities
  useEffect(() => {
    if (currentView === "Communities") {
      fetchAllCommunities();
    }
    if (currentView === "Projects") {
      fetchAllProjects();
    }
  }, [currentView, state, fetchAllCommunities, fetchAllProjects]);

  // Render the Home Component
  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center justify-between bg-[#ebebeb] p-[10px] ${jakartasmall.className} custom-scrollbar`}
    >
      <NavBar />
      <div className="flex w-full flex-col justify-between p-10 md:flex-row">
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
          className={`${currentView === "Chat" ? "w-[70%]" : "w-[40vw]"} custom-scrollbar h-[80vh] overflow-y-auto rounded-lg bg-white p-5`}
        >
          <h1 className="mb-5 text-2xl font-bold">{currentView}</h1>
          {currentView === "Chat" && <ChatWindow currentUserId={currentUserId} />}
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

          {currentView === "Projects" && (
            <div className="w-full">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Projects</h2>
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="rounded bg-blue-500 px-4 py-2 text-white"
                >
                  Create New Project
                </button>
              </div>

              <ProjectCreationModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                currentUserId={currentUserId}
                userName={user?.name || ""}
              />

              <div className="flex flex-wrap gap-4">
                {allProjects.map((project) => (
                  <div key={project.id} className="rounded-lg bg-white p-6 shadow-md">
                    <h3 className="mb-2 text-xl font-semibold">{project.title}</h3>
                    <p className="mb-4 text-gray-600">{project.description}</p>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-500">
                        {project.members.length} members
                      </span>
                      {!project.members.includes(user?.name || "") && (
                        <button
                          onClick={() => handleJoinProject(project.id)}
                          className="rounded bg-green-500 px-3 py-1 text-white"
                        >
                          Join Project
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
          <div className="custom-scrollbar h-[80vh] w-[23vw] overflow-y-auto rounded-lg bg-white p-5">
            {currentView !== "Friends" && <h1 className="pb-5 text-2xl">Add Friends</h1>}
            {currentView === "Friends" && <h1 className="pb-5 text-2xl">My Friends</h1>}
            <div className="flex w-full flex-col items-center justify-center gap-4 "></div>
            {currentView === "Friends" && myFriends.length > 0 && (
              <div className="flex w-full flex-col items-center justify-center gap-4 ">
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
              <div className="flex w-full flex-col items-center justify-center gap-4 ">
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
