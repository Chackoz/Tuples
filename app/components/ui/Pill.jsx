"use client";
import React from "react";
import { IoCloseSharp } from "react-icons/io5";
import { IoIosAdd } from "react-icons/io";

const Pill = ({ text, onClick, type }) => (
  <div
    className="flex h-fit min-w-fit cursor-pointer items-center gap-1 rounded-full border-2 border-black bg-transparent text-black"
    onClick={onClick}
  >
    <div className="flex items-center gap-1 px-3 py-2 text-sm font-semibold">
      {text} {type === "add" ? <IoIosAdd size={15} /> : <IoCloseSharp size={15} />}
    </div>
  </div>
);

export default Pill;
