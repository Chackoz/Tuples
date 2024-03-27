"use client";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { auth } from "../lib/firebaseConfig";

function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = () => {
   
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log("suceesss");
        const user = userCredential.user;
      })
      .catch((error) => {
        setError(error);
      });
  
    console.log(error);

    console.log("Login with:", { email, password });
  };
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-accent  p-5">
      <h1 className="text-5xl text-black">LOGIN</h1>
      <div className="flex w-[30%] flex-col space-y-5">
        <input
          id="email-address"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border-2 border-primary p-2 text-black focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Email address"
        />
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border-2 border-primary p-2 text-black focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Password"
        />
          <button
              type="submit"
              className="bg-blue-500 px-4 py-2 text-black " onClick={()=>handleSubmit()}
            >
              Sign in
            </button>
      </div>
    </main>
  );
}

export default Page;
