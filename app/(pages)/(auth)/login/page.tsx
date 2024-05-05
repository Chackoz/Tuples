"use client";
import React, { useState } from "react";
import { FirebaseError } from "firebase/app";
import { doc, setDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth, db } from "../../../lib/firebaseConfig";
import { poppins } from "../../../lib/fonts";

import { useRouter } from "next/navigation";

function Login() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firebaseError, setFirebaseError] = useState("");

  const handleSubmit = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/profile");
    } catch (error) {
      const firebaseError = error as FirebaseError;
      const errorMessage = firebaseError.message;
      const match = errorMessage.match(/\(([^)]+)\)/);
      if (match) {
        setFirebaseError(match[1]);
        console.log(match[1]);
      } else {
        console.log("Error message format not recognized");
      }
    }
  };

  return (
    <main className="flex h-full min-h-screen w-full flex-col items-center justify-center bg-[#f0f6ff]">
      <div className="flex h-[600px] w-[400px] flex-col justify-between rounded-3xl bg-white  p-10 shadow-md">
        <div className="">
          <h1 className={` ${poppins.className}  pt-5 text-5xl`}>Welcome Back,</h1>
          {firebaseError && (
            <h2
              className={`${poppins.className} pt-4  text-xl  tracking-tighter text-red-500`}
            >
              {firebaseError}
            </h2>
          )}
          <h2 className={`${poppins.className} py-4 pt-8 text-xl  tracking-tighter`}>
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
            className="rounded-xl border-2 border-transparent  bg-[#f0f6ff] p-3 text-xl text-black transition-all focus:border-primary focus:outline-none"
            placeholder="johndoe@mbcet.ac.in"
          />
          <h2 className={`${poppins.className} py-4 pt-8 text-xl  tracking-tighter`}>
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
            className="rounded-xl border-2 border-transparent  bg-[#f0f6ff] p-3 text-xl text-black transition-all focus:border-primary focus:outline-none"
            placeholder=""
          />

          <button
            onClick={() => handleSubmit()}
            className={`${poppins.className} my-4 w-fit rounded-3xl bg-[#2727e6] px-4  py-2 text-xl tracking-tighter text-white transition-all hover:bg-[#2727b6] hover:px-5`}
          >
            Sign In -&gt;
          </button>
        </div>
        <button
          onClick={() => router.push("/signup")}
          className={`${poppins.className} text-xl text-gray-600 underline hover:text-primary `}
        >
          New User? , Sign up instead
        </button>
      </div>
    </main>
  );
}

export default Login;
