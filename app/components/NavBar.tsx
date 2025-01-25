"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Menu, X } from "lucide-react";
import { jakartasmall } from "../utils/fonts";
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
    <div
      className={`${jakartasmall.className} relative flex w-[95vw] items-center justify-between p-5`}
    >
      {/* Mobile Development Warning */}
     
      <div className="absolute left-0 top-0 z-50 w-full bg-orange-200 text-black p-1 text-center md:hidden">
      <Marquee>
        <div className="w-full text-nowrap justify-center leading-5 gap-4">
        !  MOBILE VIEW IS STILL IN DEVELOPMENT  !
      
        </div>
        </Marquee>
      </div>
    

      <div className="flex w-full items-center justify-between pt-5">
        <a href="/" className="z-50 flex items-center justify-center  text-4xl">
          <h1 className="flex flex-row">Tuples</h1>
        </a>

        <button className="z-50 md:hidden hidden" onClick={toggleMenu}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="hidden items-center space-x-4 md:flex">
        <nav className="flex space-x-4">
          <a href="/home" className="text-sm transition-all duration-300 hover:underline">
            Home
          </a>
          <a
            href="/interests"
            className="text-sm transition-all duration-300 hover:underline"
          >
            Interests
          </a>
          <a
            href="/credits"
            className="text-sm transition-all duration-300 hover:underline"
          >
            Credits
          </a>
        </nav>
        <button
          onClick={handleLogout}
          className="rounded-md bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center space-y-6 bg-white md:hidden ">
          <a href="/home" className="text-2xl hover:underline" onClick={toggleMenu}>
            Home
          </a>
          <a href="/interests" className="text-2xl hover:underline" onClick={toggleMenu}>
            Interests
          </a>
          <a href="/credits" className="text-2xl hover:underline" onClick={toggleMenu}>
          Credits
          </a>
          <button
            onClick={() => {
              handleLogout();
              toggleMenu();
            }}
            className="rounded-md bg-red-500 px-6 py-2 text-lg text-white transition-colors hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default NavBar;
