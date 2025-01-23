"use client";
import { doc, getDoc } from "firebase/firestore";
import React, { useContext, useEffect, useState } from "react";
import { db } from "../../lib/firebaseConfig";
import AuthContext from "../../context/AuthContext";
import axios from "axios";

interface User {
  name: string;
  interests: string[];
}

interface Friend {
  name: string;
  interests: string[];
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const { currentUser } = useContext(AuthContext);

  const getUserById = async (userId: any) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        console.log("User fetched", userData);
        setUser(userData as User);
        fetchSimilarUsers(userData as User); // Fetch similar users after setting the user
        return userData;
      } else {
        console.log("Document does not exist!");
        return;
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  };

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("userId"))
      ?.split("=")?.[1];

    if (cookieValue) {
      getUserById(cookieValue);
    }
  }, []);

  const fetchSimilarUsers = async (user: User) => {
    try {
      const userInterests = user.interests
        .map((interest) => {
          if (interest === "🎨 UI/UX Design") {
            return "UI/UX Design";
          } else if (interest === "🖥️ Backend Development") {
            return "Backend Development";
          } else if (interest === "🌐 Full Stack Development") {
            return "Full Stack Development";
          } else {
            return interest;
          }
        })
        .join(", ");
      console.log("User interests: ", userInterests);

      const response = await axios.post("http://127.0.0.1:5000/api/similar_users", {
        user_interests: userInterests
      });

      console.log("Response", response.data);
      const { similar_users } = response.data;

      console.log("Similar users structure:", similar_users);

      if (
        Array.isArray(similar_users) &&
        similar_users.every(
          (user) =>
            Array.isArray(user) && typeof user[0] === "string" && Array.isArray(user[1])
        )
      ) {
        const formattedFriends = similar_users
          .map(([name, interests]) => ({ name, interests }))
          .filter((friend) => friend.name !== user.name); // Filter out the current user's name from friends list
        setFriends(formattedFriends);
      } else {
        console.error("Invalid similar_users structure:", similar_users);
      }
    } catch (error) {
      console.error("Error fetching similar users:", error);
    }
  };

  return (
    <div className="">
      <div className="text-3xl">Hi {user?.name}</div>
      <div className="flex flex-col">
        <span className="mb-2 text-lg font-semibold">Your Interests:</span>
        {user?.interests?.map((interest, index) => (
          <span key={index} className="text-md">
            {interest}
          </span>
        ))}
      </div>
      <div className="mt-4">
        <span className="mb-2 text-lg font-semibold">Friend Suggestion:</span>
        {friends.map((friend, index) => (
          <div key={index} className="mt-2">
            <span className="font-semibold">{friend.name}</span>
            <div>
              {friend.interests.map((interest, i) => (
                <span key={i} className="text-sm">
                  {interest}
                  {i < friend.interests.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
