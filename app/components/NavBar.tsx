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
    <div className="relative flex w-full items-center justify-between py-5 border-b border-gray-200 bg-gray-50">
      {/* Mobile Development Warning */}
     
      <div className="absolute left-0 top-0 z-50 w-full bg-orange-100 border-b border-gray-200 text-gray-800 p-1 text-center md:hidden">
      <Marquee>
        <div className="w-full text-nowrap text-sm font-medium justify-center leading-5 gap-4">
        !  MOBILE VIEW IS STILL IN DEVELOPMENT  !
      
        </div>
        </Marquee>
      </div>
    

      <div className="flex w-full items-center justify-between pt-5 md:pt-0">
        <a href="/" className="z-50 flex items-center justify-center">
          <div className="relative">
            <span className="text-3xl font-light tracking-tight text-gray-900">Tuples</span>
          </div>
        </a>

        <button className="z-50 md:hidden flex justify-center items-center w-10 h-10 border border-gray-200 rounded-md bg-white shadow-sm" onClick={toggleMenu}>
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="hidden items-center space-x-6 md:flex mt-0">
        <nav className="flex space-x-6">
          <a href="/home" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
            Home
          </a>
          <a
            href="/interests"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Interests
          </a>
          <a
            href="/credits"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
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
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center space-y-8 bg-gray-50 md:hidden">
          <a href="/home" className="text-3xl font-semibold text-gray-900 hover:text-blue-600" onClick={toggleMenu}>
            Home
          </a>
          <a href="/interests" className="text-3xl font-semibold text-gray-900 hover:text-blue-600" onClick={toggleMenu}>
            Interests
          </a>
          <a href="/credits" className="text-3xl font-semibold text-gray-900 hover:text-blue-600" onClick={toggleMenu}>
            Credits
          </a>
          <button
            onClick={() => {
              handleLogout();
              toggleMenu();
            }}
            className="btn-secondary px-8 py-3 text-xl mt-8 rounded-lg"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default NavBar;
