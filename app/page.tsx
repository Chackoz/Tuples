"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jakartasmall } from "./utils/fonts";

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
      <main className={`${jakartasmall.className} flex min-h-screen flex-col items-center justify-center bg-[#f0f0f0] w-full overflow-hidden`}>
        <div className="text-center">
          <h1 className="text-8xl font-bold text-blue-800 mb-8 
            animate-gradient-text bg-gradient-to-r from-slate-950 via-slate-600 to-slate-900
            bg-clip-text text-transparent animate-pulse">
            Tuples
          </h1>
          <h1 className="text-3xl font-bold text-blue-800 mb-8 
            animate-gradient-text bg-gradient-to-r from-slate-950 via-slate-600 to-slate-900
            bg-clip-text text-transparent animate-pulse">
            still in development
          </h1>
        </div>
      </main>
    );
  }

  return null;
}