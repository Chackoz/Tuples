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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-50 w-full">


      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            {/* Main text */}
            <span className="text-7xl md:text-9xl font-light tracking-tight text-gray-900 ">
              Tuples
            </span>
          </div>
          <p className="text-sm font-medium tracking-wide text-gray-500 mt-6">
            Connect · Collaborate · Grow
          </p>
        </div>

        {/* Bouncing dots */}
        <div className="flex gap-3">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"
              style={{
                animationDelay: `${delay}ms`
              }}
            />
          ))}
        </div>

        <p className="text-xs font-medium text-gray-400 mt-4">
          Checking session...
        </p>
      </div>
    </main>
  );
}

  return null;
}