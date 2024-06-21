import Image from "next/image";
import React, { useState, useEffect } from "react";
import { jakartasmall } from "../utils/fonts";
import {
  RiArrowRightCircleFill,
  RiSettings2Line,
  RiAddLine
} from "react-icons/ri";
import CommunityBox from "./ui/CommunityBox";

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import CreateCommunityModal from "./ui/CreateCommunityModal";
import CreateJoinCommunityModal from "./ui/CreateCommunityModal";


interface User {
  name: string;
  friends: string[];
}

interface Community {
  id: string;
  name: string;
  creator: string;
  members: string[];
}

function Dashboard({ user }: { user: User }) {
  const [showModal, setShowModal] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserCommunities();
    }
  }, [user]);

  const fetchUserCommunities = async () => {
    if (!user) return;

    const communitiesRef = collection(db, "communities");
    const q = query(communitiesRef, where("members", "array-contains", user.name));
    const querySnapshot = await getDocs(q);
    const userCommunities = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Community[];
    setCommunities(userCommunities);
  };

  return (
    <div className={`${jakartasmall.className} min-h-[80vh] w-[30vw] px-5`}>
      <div className="flex items-start justify-between w-full">
        <div className={`${jakartasmall.className} flex flex-col items-start justify-start text-start gap-4 py-5 text-[1vw]`}>
          <a href="/home" className="text-blue-600">Home</a>
          <a href="/profile">Profile</a>
          <h2>Friends</h2>
          <h2>Communities</h2>
          <h2>Projects</h2>
        </div>
        <div className="flex h-fit w-fit flex-col items-center justify-center rounded-lg bg-gray-100 p-2">
          <div className="flex w-full items-center justify-between">
            <h1 className="w-full py-2 text-start">Profile</h1>
            <RiSettings2Line className="h-[20px] w-[20px]" />
          </div>
          <Image
            src="/logo.png"
            alt="logo"
            width={100}
            height={100}
            className="m-1 w-[60%] rounded-2xl object-fill"
          />
          <h1 className="text-[1.5vw]">{user?.name || "Username"}</h1>
        </div>
      </div>
      <div className="flex w-full items-center justify-between py-5">
        <div className="flex flex-col items-center justify-center gap-0 leading-none">
          <h1 className="w-full text-start text-[1.5vw] text-blue-600">{user?.friends?.length || 0}</h1>
          <h2 className="text-[1.2vw] text-gray-500">Friends</h2>
        </div>
        <button className="flex h-fit w-[200px] items-center justify-between bg-blue-500 px-4 py-2 text-start text-[1vw] text-white">
          See Friends <RiArrowRightCircleFill />
        </button>
      </div>
      <div className="my-5 w-full gap-4 rounded-lg bg-white p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-[1vw]">Your Communities</h1>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white px-2 py-1 rounded text-[0.8vw] hover:bg-blue-600 flex items-center"
          >
            <RiAddLine className="mr-1" /> Create or Join
          </button>
        </div>
        <div className="flex gap-2 py-4 flex-wrap">
          {communities.map((community) => (
            <CommunityBox key={community.id} community={community} />
          ))}
        </div>
      </div>
      <div className="my-5 w-full gap-4 rounded-lg bg-white p-4">
        <h1 className="text-[1vw]">Your Projects</h1>
        <div className="flex gap-2 py-4">
          <CommunityBox />
          <CommunityBox />
          <CommunityBox />
        </div>
      </div>
      {showModal && (
        <CreateJoinCommunityModal 
          onClose={() => setShowModal(false)} 
          onCreateOrJoin={fetchUserCommunities}
          user={user}
        />
      )}
    </div>
  );
}

export default Dashboard;