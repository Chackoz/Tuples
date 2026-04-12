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
    <div className="relative w-full px-4 lg:w-[26vw] lg:px-5">
      {/* Mobile Menu Toggle */}
      <div className="flex items-center justify-between py-4 lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-none border-2 border-black bg-white p-2 shadow-[2px_2px_0px_#3b82f6]"
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
              className="object-cover w-[60px] h-[60px] border-2 border-black shadow-[4px_4px_0px_#3b82f6]"
            />
          )}
          <h1 className="heading-brutal text-lg">{user?.name || "Username"}</h1>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#f0f0f0] p-4 lg:hidden bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:32px_32px]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="heading-brutal text-2xl">Menu</h2>
            <button onClick={() => setMobileMenuOpen(false)} className="btn-secondary px-3 py-1 text-2xl">
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
                className={`block p-4 border-2 border-black subheading-brutal text-lg transition-all ${
                  currentView === item.view ? "bg-blue-500 text-white shadow-[4px_4px_0px_#000]" : "bg-white shadow-[4px_4px_0px_#3b82f6]"
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
      <div className="hidden lg:block relative card-brutal">
        {/* Corner Accents */}
        <div className="hero-corner-tl" />
        <div className="hero-corner-tr" />
        <div className="hero-corner-bl" />
        <div className="hero-corner-br" />

        <div className="flex w-full items-start justify-between">
          <nav className="flex flex-col items-start justify-start gap-4 py-5 text-start text-base">
            {menuItems.map((item) => (
              <Link
                key={item.view}
                href="#"
                onClick={() => setCurrentView(item.view)}
                className={`subheading-brutal flex items-center hover:underline decoration-2 underline-offset-4 decoration-blue-500 ${
                  currentView === item.view ? "text-blue-500" : ""
                }`}
              >
                {item.label}
                {item.hasUnread && <span className="ml-2 text-red-500">!</span>}
              </Link>
            ))}
          </nav>
          <div className="flex w-[10vw] flex-col items-center justify-center gap-4 bg-[#f0f0f0] border-2 border-black p-4 shadow-[4px_4px_0px_#3b82f6]">
            {profilePicUrl && (
              <Image
                src={profilePicUrl}
                alt="User profile"
                width={100}
                height={100}
                className="w-full h-auto aspect-square object-cover border-2 border-black"
              />
            )}
            <h1 className="heading-brutal text-center break-words w-full">{user?.name || "Username"}</h1>
          </div>
        </div>

        <div className="flex w-full items-center justify-between pt-6 border-t-2 border-black mt-4">
          <div className="flex flex-col items-start justify-center gap-0 leading-none">
            <h1 className="w-full text-start heading-brutal text-3xl">
              {user?.friends?.length - 1 || 0}
            </h1>
            <h2 className="label-brutal text-black/50 mt-1">Friends</h2>
          </div>
          <button
            onClick={toggleFriendsView}
            className="btn-primary flex items-center justify-between px-4 py-3 gap-2"
          >
            {currentView === "Friends" ? "Back to Home" : "See Friends"}{" "}
            <RiArrowRightCircleFill size={18} />
          </button>
        </div>
      </div>

      {/* Communities Section */}
      <div className="card-brutal my-8 w-full gap-4 md:flex flex-col hidden relative">
        <div className="mb-4 flex items-center justify-between pb-4 border-b-2 border-black">
          <h1 className="subheading-brutal text-lg">My Communities</h1>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center px-3 py-2"
          >
            <RiAddLine className="mr-1" /> Create / Join
          </button>
        </div>
        <div className="flex flex-wrap overflow-auto py-2 gap-4">
          {communities.length > 0 ? communities.map((community) => (
            <CommunityBox key={community.id} community={community} />
          )) : (
            <p className="label-brutal text-black/50 border-2 border-dashed border-black/20 w-full p-4 text-center">No communities yet.</p>
          )}
        </div>
      </div>

      {/* Projects Section */}
      <div className="card-brutal mt-8 w-full gap-4 md:flex flex-col hidden relative">
        <div className="mb-4 flex items-center justify-between pb-4 border-b-2 border-black">
          <h1 className="subheading-brutal text-lg">My Projects</h1>
        </div>
        <div className="flex flex-wrap gap-4 py-2">
          {projects.length > 0 ? projects.map((project) => (
            <CommunityBox key={project.id} project={project} />
          )) : (
            <p className="label-brutal text-black/50 border-2 border-dashed border-black/20 w-full p-4 text-center">No projects yet.</p>
          )}
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
