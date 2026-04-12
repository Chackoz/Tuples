"use client";
import React from "react";
import { IoCloseSharp } from "react-icons/io5";
import { IoIosAdd } from "react-icons/io";

interface PillProps {
  text: string;
  onClick?: () => void;
  type: 'add' | 'delete' | 'view' | 'default';
}

const Pill: React.FC<PillProps> = ({ text, onClick, type }) => {
  // Determine styles based on pill type
  let colorClass = "bg-white hover:bg-[#f0f0f0]";
  
  if (type === 'add') {
    colorClass = "bg-green-300 hover:bg-green-400";
  } else if (type === 'delete') {
    colorClass = "bg-red-300 hover:bg-red-400";
  } else if (type === 'default') {
    colorClass = "bg-yellow-300";
  } else if (type === 'view') {
    colorClass = "bg-blue-300";
  }

  return (
    <div
      className={`tag-brutal flex h-fit min-w-fit cursor-pointer items-center justify-center transition-transform hover:-translate-y-0.5 ${
        type !== 'view' && type !== 'default' ? 'shadow-[2px_2px_0px_#000]' : ''
      } ${colorClass}`}
      onClick={type !== 'default' && type !== 'view' ? onClick : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="break-words">{text}</span>
        {type === "add" ? (
          <IoIosAdd size={18} className="shrink-0" />
        ) : type === "delete" && text !== "MBCET" ? (
          <IoCloseSharp size={16} className="shrink-0" />
        ) : null}
      </div>
    </div>
  );
};

export default Pill;