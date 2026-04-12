"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "./components/ui/Spinner";

import { doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebaseConfig";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check for userId cookie
        const cookies = document.cookie.split('; ');
        const userIdCookie = cookies.find(row => row.startsWith('userId='));
        
        if (userIdCookie) {
          const userId = userIdCookie.split('=')[1];
          
          // Verify user exists in Firestore
          const userDoc = await getDoc(doc(db, 'users', userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Route based on user's interests
            userData.Interests && userData.interests.length > 1 
              ? router.push('/home')
              : router.push('/interests');
            return;
          }
        }
        
        // No valid cookie or user, redirect to signup
        router.push("/signup");
      } catch (error) {
        console.error("Authentication check failed:", error);
        router.push("/signup");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [router]);

 if (isLoading) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f0f0f0] w-full">
      {/* Grid texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Corner accents */}
      {[
        "top-4 left-4 border-t-2 border-l-2",
        "top-4 right-4 border-t-2 border-r-2",
        "bottom-4 left-4 border-b-2 border-l-2",
        "bottom-4 right-4 border-b-2 border-r-2",
      ].map((cls, i) => (
        <div key={i} className={`absolute w-5 h-5 border-blue-500 ${cls}`} />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            {/* Blue shadow layer */}
            <span
              className="absolute top-2 left-2 text-7xl md:text-9xl font-black tracking-tighter uppercase text-blue-500 select-none"
              aria-hidden="true"
            >
              Tuples
            </span>
            {/* Main text */}
            <span className="relative text-7xl md:text-9xl font-black tracking-tighter uppercase text-black">
              Tuples
            </span>
          </div>
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-black">
            connect · collaborate · grow
          </p>
        </div>

        {/* Bouncing dots */}
        <div className="flex gap-3">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-3 h-3 bg-black animate-bounce"
              style={{
                animationDelay: `${delay}ms`,
                boxShadow: "2px 2px 0px #3b82f6",
              }}
            />
          ))}
        </div>

        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-black/30">
          Checking session...
        </p>
      </div>
    </main>
  );
}

  return null;
}