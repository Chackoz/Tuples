"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Menu, X } from "lucide-react";
import { auth } from "../lib/firebaseConfig";
import Marquee from "react-fast-marquee";

function NavBar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="relative flex w-full items-center justify-between py-5 border-b-2 border-black bg-[#f0f0f0]">
      {/* Mobile Development Warning */}
     
      <div className="absolute left-0 top-0 z-50 w-full bg-orange-200 border-b-2 border-black text-black p-1 text-center md:hidden">
      <Marquee>
        <div className="w-full text-nowrap label-brutal justify-center leading-5 gap-4">
        !  MOBILE VIEW IS STILL IN DEVELOPMENT  !
      
        </div>
        </Marquee>
      </div>
    

      <div className="flex w-full items-center justify-between pt-5 md:pt-0">
        <a href="/" className="z-50 flex items-center justify-center">
          <div className="relative">
            <span className="absolute top-1 left-1 heading-brutal text-3xl text-blue-500 select-none" aria-hidden="true">Tuples</span>
            <span className="relative heading-brutal text-3xl text-black">Tuples</span>
          </div>
        </a>

        <button className="z-50 md:hidden flex justify-center items-center w-10 h-10 border-2 border-black bg-white shadow-[2px_2px_0px_#3b82f6]" onClick={toggleMenu}>
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="hidden items-center space-x-6 md:flex mt-0">
        <nav className="flex space-x-6">
          <a href="/home" className="subheading-brutal text-sm hover:underline underline-offset-4 decoration-2 decoration-blue-500">
            Home
          </a>
          <a
            href="/interests"
            className="subheading-brutal text-sm hover:underline underline-offset-4 decoration-2 decoration-blue-500"
          >
            Interests
          </a>
          <a
            href="/credits"
            className="subheading-brutal text-sm hover:underline underline-offset-4 decoration-2 decoration-blue-500"
          >
            Credits
          </a>
        </nav>
        <button
          onClick={handleLogout}
          className="btn-secondary ml-4 px-4 py-2"
        >
          Logout
        </button>
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center space-y-8 bg-[#f0f0f0] bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:32px_32px] md:hidden">
          <a href="/home" className="heading-brutal text-3xl hover:underline decoration-blue-500 decoration-4 underline-offset-8" onClick={toggleMenu}>
            Home
          </a>
          <a href="/interests" className="heading-brutal text-3xl hover:underline decoration-blue-500 decoration-4 underline-offset-8" onClick={toggleMenu}>
            Interests
          </a>
          <a href="/credits" className="heading-brutal text-3xl hover:underline decoration-blue-500 decoration-4 underline-offset-8" onClick={toggleMenu}>
            Credits
          </a>
          <button
            onClick={() => {
              handleLogout();
              toggleMenu();
            }}
            className="btn-secondary px-8 py-3 text-xl mt-8"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default NavBar;
