"use client";
import React, { useState } from "react";
import { FirebaseError } from "firebase/app";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { auth, db } from "../lib/firebaseConfig";
import { poppins } from "../lib/fonts";
import { generatePassword } from "../utils/generatePassword";
import { useRouter } from "next/navigation";

function Page() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [conpassword, setConPassword] = useState("");
  const [error, setError] = useState(false);
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [firsttry, setfirsttry] = useState(true);
  const [next, setNext] = useState(false);
  const [firebaseError, setfirebaseError] = useState("");

  const router = useRouter();

  const handleSubmit = async () => {
    setfirsttry(false);
    const emailValue = email;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@mbcet.ac.in$/;
    const validEmail = emailRegex.test(emailValue);
    console.log(validEmail);
    setIsValidEmail(validEmail);
    if (isValidEmail) {
      const extractedName = email.split("@")[0].split(".")[0];
      const capitalizedExtractedName =
        extractedName.charAt(0).toUpperCase() + extractedName.slice(1);
      setName(capitalizedExtractedName);
      setNext(true);
    }
  };

  const handleSignup = async () => {
    setError(false);
    setfirebaseError("");
    if (password != conpassword) {
      setError(true);
    } else {
      if (isValidEmail) {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          const user = userCredential.user;
          await addData(name, user.uid);
          // try {
          //   await fetch('/api/send', {
          //     method: 'POST',
          //     headers: {
          //       'Content-Type': 'application/json',
          //     },
          //     body: JSON.stringify({
          //       name: name,
          //       email: email,
          //       password:password
          //     }),
          //   }).then(() => {
          //     console.log(email,password,name)
          //   });
          // } catch (error) {
          //   console.error("Error sending email:", error);
          // }
          addCookie(user.uid);
          router.push("/interests");
        } catch (error) {
          const firebaseError = error as FirebaseError;
          const errorMessage = firebaseError.message;
          const match = errorMessage.match(/\(([^)]+)\)/);
          if (match) {
            setfirebaseError(match[1]);
            console.log(match[1]);
          } else {
            console.log("Error message format not recognized");
          }
        }
      }
    }
  };

  const addData = async (name: string, id: string) => {
    try {
      const userRef = doc(db, "users", id);
      await setDoc(userRef, { name });
      console.log("Name written with ID: ", userRef.id);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const addCookie = (id: string) => {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    document.cookie = `userId=${id}; expires=${expires.toUTCString()}`;
  };

  return (
    <main className="flex h-full min-h-screen w-full flex-col items-center justify-center bg-[#f0f6ff] ">
      {!next && (
        <div className="flex h-[600px] w-[400px] flex-col justify-between rounded-3xl bg-white  p-10 shadow-md">
          <div className="">
            <h1 className={` ${poppins.className}  pt-5 text-5xl`}>Sign Up</h1>
            {!isValidEmail && !firsttry && (
              <h2
                className={`${poppins.className} py-4  text-xl  tracking-tighter text-red-500`}
              >
                Use valid college email id.
              </h2>
            )}
            <h2 className={`${poppins.className} py-4 pt-8 text-xl  tracking-tighter`}>
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
              className="rounded-xl border-2 border-transparent  bg-[#f0f6ff] p-3 text-xl text-black transition-all focus:border-primary focus:outline-none"
              placeholder="johndoe@mbcet.ac.in"
            />

            <button
              onClick={() => handleSubmit()}
              className={`${poppins.className} my-4 w-fit rounded-3xl bg-[#2727e6] px-4  py-2 text-xl tracking-tighter text-white transition-all hover:bg-[#2727b6] hover:px-5`}
            >
              Sign Up -&gt;
            </button>
          </div>
          <div>
            By continuing, you agree to our terms and conditions and privacy policy.
          </div>
        </div>
      )}
      {next && (
        <div className="flex h-[600px] w-[400px] flex-col justify-between rounded-3xl bg-white  p-10 shadow-md">
          <div className="">
            <h1 className={` ${poppins.className}  pt-5 text-5xl`}>Hello ,</h1>
            <h1 className={` ${poppins.className}  pt-5 text-3xl`}>{name}</h1>
            {error && !firebaseError && (
              <h2
                className={`${poppins.className} py-2  text-xl  tracking-tighter text-red-500`}
              >
                Passwords don&apos;t Match
              </h2>
            )}
            {firebaseError && (
              <h2
                className={`${poppins.className} py-2  text-xl  tracking-tighter text-red-500`}
              >
                {firebaseError}
              </h2>
            )}
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
            <h2 className={`${poppins.className} py-4 pt-8 text-xl  tracking-tighter`}>
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
              className="rounded-xl border-2 border-transparent  bg-[#f0f6ff] p-3 text-xl text-black transition-all focus:border-primary focus:outline-none"
              placeholder=""
            />

            <button
              onClick={() => handleSignup()}
              className={`${poppins.className} my-2 mt-6  w-fit rounded-3xl bg-[#2727e6] px-4  py-2 text-xl tracking-tighter text-white transition-all hover:bg-[#2727b6] hover:px-5 `}
            >
              Confirm
            </button>
          </div>
          <button
            onClick={() => setNext(false)}
            className={`${poppins.className} text-xl text-gray-600 underline hover:text-primary `}
          >
            Go Back
          </button>
        </div>
      )}
    </main>
  );
}

export default Page;
