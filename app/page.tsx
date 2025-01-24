"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { jakartasmall } from "./utils/fonts";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/signup");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className={`${jakartasmall.className} flex min-h-screen flex-col items-center justify-center bg-[#f0f0f0] w-full overflow-hidden`}>
      <div className="text-center">
        <h1 className="text-8xl font-bold text-blue-800 mb-8 
          animate-gradient-text bg-gradient-to-r from-blue-600 via-purple-500 to-blue-400 
          bg-clip-text text-transparent animate-pulse">
          Tuples
        </h1>
        <h1 className="text-3xl font-bold text-blue-800 mb-8 
          animate-gradient-text bg-gradient-to-r from-slate-950 via-slate-600 to-slate-900
          bg-clip-text text-transparent animate-pulse">
          Still in developement
        </h1>
      </div>
    </main>
  );
}