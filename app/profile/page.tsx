"use client";
import { doc, getDoc } from "firebase/firestore";
import React, { useContext, useEffect, useState } from "react";
import { db } from "../lib/firebaseConfig";
import AuthContext from "../context/AuthContext";

interface User {
  name: string;
  interests: string[];
}
const Profile = () => {
  const [user, setUser] = useState<User>();
  const { currentUser } = useContext(AuthContext);

  const getUserById = async (userId: any) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        console.log("user Fetched", userData);
        setUser(userData as User);
        return userData;
      } else {
        console.log("Document does not exist!");
        return;
      }
    } catch (error) {
      console.error("Error fetching user: ", error);
      return null;
    }
  };

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("userId"))
      ?.split("=")[1];
    //  console.log((currentUser as any)?.uid)
    getUserById(cookieValue);
  }, []);

  return (
    <div className="">
      <div className="text-3xl">Hi {user?.name}</div>
      <div className="flex flex-col">
        Your Interests are
        {user?.interests?.map((interest, index) => {
          return (
            <span key={index} className="text-md">
              {interest}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default Profile;
