"use client"
import React from 'react';
import { IoCloseSharp } from "react-icons/io5";
import { IoIosAdd } from "react-icons/io";

const Pill = ({ text, onClick, type }) => (
  <div className="h-fit min-w-fit flex items-center gap-1 bg-transparent border-black border-2 text-black rounded-full cursor-pointer" onClick={onClick}>
    <div className="px-3 py-2 text-sm flex items-center gap-1 font-semibold">{text} {type === 'add' ? <IoIosAdd size={15} /> : <IoCloseSharp size={15} />}</div>
  </div>
);

export default Pill;