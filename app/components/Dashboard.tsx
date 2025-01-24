import Image from "next/image";
import React, { useState, useEffect } from "react";
import { jakartasmall } from "../utils/fonts";
import { RiArrowRightCircleFill, RiAddLine, RiMenuLine } from "react-icons/ri";
import CommunityBox from "./ui/CommunityBox";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import Link from "next/link";
import CreateJoinCommunityModal from "./ui/CreateCommunityModal";
import { Community, Project, User } from "../types";

function Dashboard({
  user,
  currentView,
  setCurrentView,
  state,
  setstate,
  currentUserId,
  ifUnread
}: {
  user: User;
  currentView: string;
  setCurrentView: (view: string) => void;
  state: boolean;
  setstate: (view: boolean) => void;
  currentUserId: string;
  ifUnread: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserCommunities();
      fetchUserProjects();
    }
  }, [user, currentView]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userRef = doc(db, "users", currentUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          setProfilePicUrl(userData.profilePicUrl || "/logo.png");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (currentUserId) {
      fetchUserProfile();
    }
  }, [currentUserId]);

  const fetchUserProjects = async () => {
    if (!user) return;

    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("members", "array-contains", user.name));
    const querySnapshot = await getDocs(q);
    const userProjects = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];
    setProjects(userProjects);
  };

  const fetchUserCommunities = async () => {
    if (!user) return;

    const communitiesRef = collection(db, "communities");
    const q = query(communitiesRef, where("members", "array-contains", user.name));
    const querySnapshot = await getDocs(q);
    const userCommunities = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Community[];
    setCommunities(userCommunities);
  };

  const toggleFriendsView = () => {
    setCurrentView(currentView === "Friends" ? "Explore" : "Friends");
  };

  const menuItems = [
    { view: "Explore", label: "Home" },
    { view: "Profile", label: "Profile" },
    { view: "Chat", label: "Chat", hasUnread: ifUnread },
    { view: "Communities", label: "Communities" },
    { view: "Projects", label: "Projects" },
    { view: "Friends", label: "Friends" }
  ];

  return (
    <div className={`${jakartasmall.className} relative w-full px-4 lg:w-[26vw] lg:px-5`}>
      {/* Mobile Menu Toggle */}
      <div className="flex items-center justify-between py-4 lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded bg-gray-100 p-2"
        >
          <RiMenuLine />
        </button>
        <div className="flex items-center space-x-4 overflow-hidden ">
          {profilePicUrl && (
            <Image
              src={profilePicUrl}
              alt="User profile"
              width={50}
              height={50}
              className="rounded-full object-cover w-[60px] h-[60px]"
            />
          )}
          <h1 className="text-lg">{user?.name || "Username"}</h1>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white p-4 lg:hidden">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold">Menu</h2>
            <button onClick={() => setMobileMenuOpen(false)} className="text-2xl">
              &times;
            </button>
          </div>
          <nav className="space-y-4">
            {menuItems.map((item) => (
              <Link
                key={item.view}
                href="#"
                onClick={() => {
                  setCurrentView(item.view);
                  setMobileMenuOpen(false);
                }}
                className={`block rounded p-3 ${
                  currentView === item.view ? "bg-blue-100 text-blue-600" : ""
                }`}
              >
                {item.label}
                {item.hasUnread && <span className="ml-2 text-red-500">!</span>}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="flex w-full items-start justify-between">
          <nav className="flex flex-col items-start justify-start gap-4 py-5 text-start text-base">
            {menuItems.map((item) => (
              <Link
                key={item.view}
                href="#"
                onClick={() => setCurrentView(item.view)}
                className={`flex items-center ${
                  currentView === item.view ? "text-blue-600" : ""
                }`}
              >
                {item.label}
                {item.hasUnread && <span className="ml-2 text-red-500">!</span>}
              </Link>
            ))}
          </nav>
          <div className="flex w-[14vw] flex-col items-center justify-center gap-4 rounded-lg bg-gray-100 p-2">
            {profilePicUrl && (
              <Image
                src={profilePicUrl}
                alt="User profile"
                width={100}
                height={100}
                className="m-1 w-[100px] h-[100px]  object-cover rounded-full"
              />
            )}
            <h1 className="text-[1.5vw]">{user?.name || "Username"}</h1>
          </div>
        </div>

        <div className="flex w-full items-center justify-between py-5">
          <div className="flex flex-col items-center justify-center gap-0 leading-none">
            <h1 className="w-full text-start text-2xl text-blue-600">
              {user?.friends?.length - 1 || 0}
            </h1>
            <h2 className="text-lg text-gray-500">Friends</h2>
          </div>
          <button
            onClick={toggleFriendsView}
            className="flex h-fit w-[200px] items-center justify-between bg-blue-500 px-4 py-2 text-start text-base text-white transition-colors hover:bg-blue-600"
          >
            {currentView === "Friends" ? "Back to Home" : "See Friends"}{" "}
            <RiArrowRightCircleFill />
          </button>
        </div>
      </div>

      {/* Communities Section */}
      <div className="my-5 w-full gap-4 rounded-lg bg-white p-4 shadow md:flex flex-col hidden">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">My Communities</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center rounded bg-blue-500 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-600"
          >
            <RiAddLine className="mr-1" /> Create or Join
          </button>
        </div>
        <div className="flex flex-wrap overflow-auto py-4 gap-4">
          {communities.map((community) => (
            <CommunityBox key={community.id} community={community} />
          ))}
        </div>
      </div>

      {/* Projects Section */}
      <div className="mt-5 w-full gap-4 rounded-lg bg-white p-4 shadow md:flex flex-col hidden">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">My Projects</h1>
          {/* <button
            onClick={() => setShowProjectModal(true)}
            className="flex items-center rounded bg-blue-500 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-600"
          >
            <RiAddLine className="mr-1" /> Create Project
          </button> */}
        </div>
        <div className="flex flex-wrap gap-4">
          {projects.map((project) => (
            <CommunityBox key={project.id} project={project} />
          ))}
        </div>
      </div>

      {showModal && (
        <CreateJoinCommunityModal
          onClose={() => setShowModal(false)}
          onCreateOrJoin={fetchUserCommunities}
          user={user}
          state={state}
          setstate={setstate}
          currentUserId={currentUserId}
          privateCommunity={false}
        />
      )}
    </div>
  );
}

export default Dashboard;
