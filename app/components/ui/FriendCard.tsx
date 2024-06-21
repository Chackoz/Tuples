import Image from "next/image";
import React from "react";

function FriendCard({ friend }: { friend: { name: string, interests: string[] } }) {
  return (
    <div className="flex h-fit w-[90%] rounded-2xl bg-[#eeeeee] p-4">
      {/* <Image
        src="/logo.png"
        alt="logo"
        width={200}
        height={200}
        className="m-1 w-[20%] rounded-2xl object-fill flex-shrink-0"
      /> */}
      <div className="my-auto flex h-full w-full flex-col justify-center p-2">
        <h1 className="text-[1vw]">{friend.name}</h1>
        <h2 className="text-[0.6vw]">Interests: {friend.interests.join(", ")}</h2>
      </div>
    </div>
  );
}

export default FriendCard;