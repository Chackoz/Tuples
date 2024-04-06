"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { auth, db } from "../lib/firebaseConfig";

function Page() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const router = useRouter();
  const handleSubmit = () => {
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log("sucess");
        const user = userCredential.user;
        console.log(user.uid);

        addCookie(user.uid);
        addData(name, user.uid);
        router.push("/interests");
      })
      .catch((error) => {
        setError(error);
      });

    console.log(error);

    console.log("Login with:", { email, password });
  };
  3;
  const addData = async (name: string, id: string) => {
    try {
      const userRef = doc(db, "users", id);
      await setDoc(userRef, { name: name });
      // const docRef = await addDoc(collection(db, 'user'), {
      //   name: 'John Doe',
      //   age: 30,
      // });
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
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-accent  p-5">
      <h1 className="text-5xl text-black">LOGIN</h1>
      <div className="flex w-[30%] flex-col space-y-5">
        <input
          type="name"
          required
          name="name"
          placeholder="Name"
          value={name}
          className="rounded-xl border-2 border-primary p-2 text-black focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          onChange={(e) => setName(e.target.value)}
        />
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
          className="bg-blue-500 px-4 py-2 text-black "
          onClick={() => handleSubmit()}
        >
          Sign in
        </button>
      </div>
    </main>
  );
}

export default Page;
