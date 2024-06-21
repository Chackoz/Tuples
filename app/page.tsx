"use client"
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  router.push("/signup")
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 ">
      <h1 className="text-[5vw]">Tuples</h1>
      <h2 className="text-[1vw]">Coming Soon</h2>
    </main>
  );
}
