"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { poppins } from "../../../lib/fonts";
import { useAuth } from "@/app/hooks/useAuth";


function Page() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [conpassword, setConPassword] = useState("");
  const [next, setNext] = useState(false);
  
  const { 
    name, 
    email, 
    error, 
    isValidEmail, 
    verificationSent, 
    setEmail, 
    validateEmail, 
    signUp 
  } = useAuth();

  const handleSubmit = () => {
    if (validateEmail()) {
      setNext(true);
    }
  };

  const handleSignup = async () => {
    await signUp(password, conpassword);
  };

  return (
    <main className="flex h-full min-h-screen w-full flex-col items-center justify-center bg-[#ebebeb] px-10 md:px-4">
      {!next && (
        <div className="flex w-full max-w-[500px] flex-col justify-between gap-8 rounded-md bg-white p-8 shadow-md sm:p-10">
          <div className="w-full">
            <h1 className={`${poppins.className} pt-5 text-4xl sm:text-5xl`}>Sign Up</h1>
            {error && (
              <h2 className={`${poppins.className} pt-4 text-lg tracking-tighter text-red-500`}>
                {error}
              </h2>
            )}
            <h2 className={`${poppins.className} py-4 pt-8 text-xl tracking-tighter`}>
              Your email address
            </h2>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mx-auto w-full rounded-xl border-2 border-transparent bg-[#f0f6ff] p-3 text-xl text-black transition-all focus:border-primary focus:outline-none"
              placeholder="johndoe@mbcet.ac.in"
            />

            <button
              onClick={handleSubmit}
              className={`${poppins.className} my-4 w-fit rounded-3xl bg-blue-600 px-4 py-2 text-xl tracking-tighter text-white transition-all hover:bg-[#2727b6] hover:px-5`}
            >
              Sign Up -&gt;
            </button>
          </div>
          <div>
            By continuing, you agree to our terms and conditions and privacy policy.{" "}
            <br />
            <button
              onClick={() => router.push("/login")}
              className={`${poppins.className} w-full p-2 text-center text-xl text-gray-600 underline hover:text-primary`}
            >
              Sign In Instead
            </button>
          </div>
        </div>
      )}
      {next && !verificationSent && (
        <div className="flex w-full max-w-[400px] flex-col justify-between rounded-3xl bg-white p-8 shadow-md sm:p-10">
          <div>
            <h1 className={`${poppins.className} pt-5 text-4xl sm:text-5xl`}>Hello,</h1>
            <h1 className={`${poppins.className} pt-5 text-2xl sm:text-3xl`}>{name}</h1>
            {error && (
              <h2 className={`${poppins.className} pt-2 text-lg tracking-tighter text-red-500`}>
                {error}
              </h2>
            )}
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
            />
            <h2 className={`${poppins.className} py-4 pt-8 text-xl tracking-tighter`}>
              Confirm Password
            </h2>
            <input
              id="conpassword"
              name="conpassword"
              type="password"
              autoComplete="conpassword"
              required
              value={conpassword}
              onChange={(e) => setConPassword(e.target.value)}
              className="w-full rounded-xl border-2 border-transparent bg-[#f0f6ff] p-3 text-xl text-black transition-all focus:border-primary focus:outline-none"
            />

            <button
              onClick={handleSignup}
              className={`${poppins.className} my-2 mt-6 w-fit rounded-3xl bg-[#2727e6] px-4 py-2 text-xl tracking-tighter text-white transition-all hover:bg-[#2727b6] hover:px-5`}
            >
              Confirm
            </button>
          </div>
          <button
            onClick={() => setNext(false)}
            className={`${poppins.className} text-xl text-gray-600 underline hover:text-primary`}
          >
            Go Back
          </button>
        </div>
      )}
      {verificationSent && (
        <div className="flex w-full max-w-[400px] flex-col items-center justify-center rounded-3xl bg-white p-8 shadow-md sm:p-10">
          <h1 className={`${poppins.className} mb-4 text-center text-2xl sm:text-3xl`}>
            Verification Email Sent
          </h1>
          <p className={`${poppins.className} mb-6 text-center text-lg sm:text-xl`}>
            Please check your email and click on the verification link to complete your
            registration.
          </p>
          <button
            onClick={() => router.push("/login")}
            className={`${poppins.className} w-fit rounded-3xl bg-blue-600 px-4 py-2 text-xl tracking-tighter text-white transition-all hover:bg-[#2727b6] hover:px-5`}
          >
            Go to Login
          </button>
        </div>
      )}
    </main>
  );
}

export default Page;