"use client";
import React from "react";
import { IoCloseSharp } from "react-icons/io5";
import { IoIosAdd } from "react-icons/io";

interface PillProps {
  text: string;
  onClick?: () => void;
  type: 'add' | 'delete' | 'view' | 'default';
}

const Pill: React.FC<PillProps> = ({ text, onClick, type }) => (
  <div
    className="flex h-fit min-w-fit cursor-pointer items-center gap-1 rounded-full border-2 border-black bg-transparent text-black"
    onClick={type !== 'default' ? onClick : undefined}
  >
    <div className="flex items-center gap-1 px-3 py-2 text-sm font-semibold">
      {text} 
      {type === "add" ? (
        <IoIosAdd size={15} />
      ) : type === "delete" && text !== "MBCET" ? (
        <IoCloseSharp size={15} />
      ) : null}
    </div>
  </div>
);

export default Pill;