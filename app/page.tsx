"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/signup");
    }, 2000); // Redirect after 2 seconds
    return () => clearTimeout(timer); // Clean up timer
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white w-full">
      <h1 className="text-[4vw] font-bold text-gray-800">Tuples</h1>
      <div className="mt-6 h-8 w-8 rounded-full border-4 border-gray-300 border-t-gray-800 animate-spin"></div>
    </main>
  );
}
