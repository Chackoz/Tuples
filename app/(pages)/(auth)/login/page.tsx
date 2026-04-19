"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { poppins } from "../../../lib/fonts";
import { useAuth } from "@/app/hooks/useAuth";

function Login() {
  const router = useRouter();
  const [password, setPassword] = useState("");

  const { email, error, isLoading, setEmail, login } = useAuth();

  const handleSubmit = async () => {
    await login(password);
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#f0f0f0] px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">

        {/* Header */}
        <div>
          <h1 className={`${poppins.className} text-3xl font-semibold text-gray-900`}>
            Welcome back
          </h1>
          <p className={`${poppins.className} mt-1 text-sm text-gray-400`}>
            Sign in to your Tuples account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Fields */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email-address"
              className={`${poppins.className} text-sm font-medium text-gray-600`}
            >
              Email
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-transparent bg-[#f0f6ff] px-4 py-3 text-sm text-gray-900 transition-all focus:border-blue-400 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`${poppins.className} w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>

          <button
            onClick={() => router.push("/signup")}
            className={`${poppins.className} text-sm text-gray-400 transition-colors hover:text-blue-600`}
          >
            Don&apos;t have an account?{" "}
            <span className="font-medium text-blue-600">Sign up</span>
          </button>
        </div>

      </div>
    </main>
  );
}

export default Login;