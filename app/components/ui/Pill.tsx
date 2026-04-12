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
  let colorClass = "bg-white hover:bg-gray-50";
  
  if (type === 'add') {
    colorClass = "bg-green-100 text-green-800 hover:bg-green-100 text-green-800";
  } else if (type === 'delete') {
    colorClass = "bg-red-300 hover:bg-red-400";
  } else if (type === 'default') {
    colorClass = "bg-blue-100 text-blue-800";
  } else if (type === 'view') {
    colorClass = "bg-cyan-100 text-cyan-800";
  }

  return (
    <div
      className={`tag-brutal flex h-fit min-w-fit cursor-pointer items-center justify-center transition-transform hover:-translate-y-0.5 ${
        type !== 'view' && type !== 'default' ? 'shadow-sm' : ''
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