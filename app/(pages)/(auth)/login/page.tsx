"use client";
import React, { useState, useEffect } from "react";
import { FirebaseError } from "firebase/app";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../../lib/firebaseConfig";
import { poppins } from "../../../lib/fonts";
import { useRouter } from "next/navigation";

function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const addCookie = (id: string) => {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    document.cookie = `userId=${id}; expires=${expires.toUTCString()}`;
  };

  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        await updateEmailVerificationStatus(user.uid);
        addCookie(user.uid);

        userData.interests && userData.interests.length > 0
          ? router.push("/home")
          : router.push("/interests");
      } else {
        setError("User data not found. Please sign up first.");
      }
    } catch (error) {
      const firebaseError = error as FirebaseError;
      const match = firebaseError.message.match(/\(([^)]+)\)/);
      setError(match ? match[1] : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmailVerificationStatus = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { emailVerified: true });
    } catch (error) {
      console.error("Error updating email verification status:", error);
    }
  };

  return (
    <main className="flex h-full min-h-screen w-full flex-col items-center justify-center bg-[#ebebeb] px-4">
      <div className="flex w-full max-w-[500px] flex-col justify-between rounded-sm bg-white p-8 shadow-md sm:p-10">
        <div>
          <h1 className={`${poppins.className} pt-5 text-4xl sm:text-5xl`}>
            Welcome Back,
          </h1>
          {error && (
            <h2
              className={`${poppins.className} pt-4 text-lg tracking-tighter text-red-500`}
            >
              {error}
            </h2>
          )}
          <h2 className={`${poppins.className} py-4 pt-8 text-xl tracking-tighter`}>
            Email
          </h2>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border-2 border-transparent bg-[#f0f6ff] p-3 text-xl text-black transition-all focus:border-primary focus:outline-none"
            placeholder="johndoe@mbcet.ac.in"
          />
          <h2 className={`${poppins.className} py-4 pt-8 text-xl tracking-tighter`}>
            Password
          </h2>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border-2 border-transparent bg-[#f0f6ff] p-3 text-xl text-black transition-all focus:border-primary focus:outline-none"
            placeholder=""
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`${poppins.className} my-4 w-fit rounded-3xl bg-blue-600 px-4 py-2 text-xl tracking-tighter text-white transition-all hover:bg-[#2727b6] hover:px-5 ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {isLoading ? "Signing In..." : "Sign In ->"}
          </button>
        </div>
        <button
          onClick={() => router.push("/signup")}
          className={`${poppins.className} text-xl text-gray-600 underline hover:text-primary`}
        >
          New User? Sign up instead
        </button>
      </div>
    </main>
  );
}

export default Login;
