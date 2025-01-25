"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { jakartasmall } from "@/app/utils/fonts";
import NavBar from "./components/NavBar";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className={`flex min-h-screen flex-col items-center justify-between bg-[#ebebeb] p-4 ${jakartasmall.className}`}>
        <NavBar/>
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-blue-500">404</h1>
        <h2 className="mb-4 text-2xl font-semibold">Page Not Found</h2>
        <p className="mb-6 text-gray-600">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <button 
          onClick={() => router.push("/")}
          className="rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 transition-colors"
        >
          Return to Home
        </button>
      </div>
      <div> </div>
    </div>
  );
}