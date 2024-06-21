import Image from "next/image";
import React from "react";
import { jakartasmall } from "../utils/fonts";
import {
  RiArrowDownCircleLine,
  RiArrowLeftCircleFill,
  RiArrowRightCircleFill,
  RiSettings2Fill,
  RiSettings2Line
} from "react-icons/ri";
import CommunityBox from "./ui/CommunityBox";

function Dashboard({ user }: { user: any }) {
  return (
    <div className={` ${jakartasmall.className} min-h-[95vh] w-[22vw] px-5 `}>
      <div className="flex items-start justify-between w-full ">
        <div
          className={`${jakartasmall.className} flex flex-col items-start justify-start text-start gap-4 py-5 text-[1vw]`}
        >
          <a href="/home" className="text-blue-600">Home</a>
          <a href="/profile">Profile</a>
          <h2>Friends</h2>
          <h2>Communities</h2>
          <h2>Projects</h2>
        </div>
        <div className="flex h-fit w-[250px] flex-col items-center justify-center rounded-lg bg-gray-100 p-5">
          <div className="flex w-full items-center justify-between">
            <h1 className="w-full py-2 text-start">Profile</h1>
            <RiSettings2Line className="h-[20px] w-[20px]" />
          </div>
          <Image
            src="/logo.png"
            alt="logo"
            width={200}
            height={200}
            className="m-1 w-[60%] rounded-2xl object-fill"
          />
          <h1 className="text-[1.5vw]">{user?.name || "Username"}</h1>
        </div>
      </div>
      <div className="flex w-full items-center justify-between py-5">
        <div className="flex flex-col items-center justify-center gap-0 leading-none">
          <h1 className="w-full text-start text-[1.5vw] text-blue-600">100</h1>
          <h2 className="text-[1.2vw] text-gray-500">Friends</h2>
        </div>
        <button className="flex h-fit w-[200px] items-center justify-between bg-blue-500 px-4 py-2 text-start text-[1vw] text-white">
          See Friends <RiArrowRightCircleFill />{" "}
        </button>
      </div>

      <div className="my-5 w-full gap-4 rounded-lg bg-white p-4 ">
        <h1 className="text-[1vw]">Your Communities</h1>
        <div className="flex gap-2 py-4">
          <CommunityBox />
          <CommunityBox />
          <CommunityBox />
        </div>
      </div>
      <div className="my-5 w-full gap-4 rounded-lg bg-white p-4 ">
        <h1 className="text-[1vw]">Your Projects</h1>
        <div className="flex gap-2 py-4">
          <CommunityBox />
          <CommunityBox />
          <CommunityBox />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;