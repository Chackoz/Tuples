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
    signUp,
  } = useAuth();

  const handleSubmit = () => {
    if (validateEmail()) setNext(true);
  };

  const handleSignup = async () => {
    await signUp(password, conpassword);
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#f0f0f0] px-4 py-12">

      {/* Step 1 — Email */}
      {!next && (
        <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
          <div>
            <h1 className={`${poppins.className} text-3xl font-semibold text-gray-900`}>
              Create account
            </h1>
            <p className={`${poppins.className} mt-1 text-sm text-gray-400`}>
              Join Tuples with your college email
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email-address"
              className={`${poppins.className} text-sm font-medium text-gray-600`}
            >
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-transparent bg-[#f0f6ff] px-4 py-3 text-sm text-gray-900 transition-all focus:border-blue-400 focus:outline-none"
              placeholder="johndoe@mbcet.ac.in"
            />
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={handleSubmit}
              className={`${poppins.className} w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700`}
            >
              Continue
            </button>
            <p className={`${poppins.className} text-center text-xs text-gray-400`}>
              By continuing, you agree to our terms and privacy policy.
            </p>
            <button
              onClick={() => router.push("/login")}
              className={`${poppins.className} text-sm text-gray-400 transition-colors hover:text-blue-600`}
            >
              Already have an account?{" "}
              <span className="font-medium text-blue-600">Sign in</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Password */}
      {next && !verificationSent && (
        <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
          <div>
            <p className={`${poppins.className} text-sm text-gray-400`}>
              Welcome,
            </p>
            <h1 className={`${poppins.className} text-3xl font-semibold text-gray-900 break-words`}>
              {name}
            </h1>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className={`${poppins.className} text-sm font-medium text-gray-600`}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-transparent bg-[#f0f6ff] px-4 py-3 text-sm text-gray-900 transition-all focus:border-blue-400 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="conpassword"
                className={`${poppins.className} text-sm font-medium text-gray-600`}
              >
                Confirm password
              </label>
              <input
                id="conpassword"
                name="conpassword"
                type="password"
                autoComplete="new-password"
                required
                value={conpassword}
                onChange={(e) => setConPassword(e.target.value)}
                className="w-full rounded-xl border border-transparent bg-[#f0f6ff] px-4 py-3 text-sm text-gray-900 transition-all focus:border-blue-400 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={handleSignup}
              className={`${poppins.className} w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700`}
            >
              Create account
            </button>
            <button
              onClick={() => setNext(false)}
              className={`${poppins.className} text-sm text-gray-400 transition-colors hover:text-blue-600`}
            >
              ← Go back
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Verification sent */}
      {verificationSent && (
        <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl bg-white p-8 text-center shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
            ✉️
          </div>
          <div>
            <h1 className={`${poppins.className} text-2xl font-semibold text-gray-900`}>
              Check your inbox
            </h1>
            <p className={`${poppins.className} mt-2 text-sm text-gray-400`}>
              We sent a verification link to{" "}
              <span className="font-medium text-gray-600">{email}</span>.
              Click it to complete your registration.
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className={`${poppins.className} w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700`}
          >
            Go to sign in
          </button>
        </div>
      )}

    </main>
  );
}

export default Page;