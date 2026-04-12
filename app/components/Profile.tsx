import React, { useState, useEffect, useRef, KeyboardEventHandler } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import { skills } from "../lib/skills";

import axios from "axios";
import Pill from "./ui/Pill";
import { Post } from "../types";

interface ProfileProps {
  userId: string;
}

interface User {
  name: string;
  interests: string[];
  userId: string;
  profilePicUrl?: string;
}

const Profile: React.FC<ProfileProps> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInterests, setEditedInterests] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [profilePicUrl, setProfilePicUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const suggestionRef = useRef<(HTMLLIElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          const interests = userData.interests?.length 
          ? (userData.interests.includes('MBCET') 
            ? userData.interests 
            : ['MBCET', ...userData.interests]) 
          : ['MBCET'];
          setUser(userData);
          setEditedInterests(userData.interests || []);
          setProfilePicUrl(userData.profilePicUrl);
          
          // Fetch user posts
          const postsQuery = query(
            collection(db, "posts"),
            where("userId", "==", userId)
          );
          const postsSnapshot = await getDocs(postsQuery);
          const posts = postsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Post));
          setUserPosts(posts);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSuggestions([]);
      return;
    }
    const matchingSkills = skills.filter((skill) =>
      skill.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSuggestions(matchingSkills);
    setSelectedSuggestion(0);
  }, [searchTerm]);

  const uploadToImgBB = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post(`https://api.imgbb.com/1/upload`, formData, {
        params: { key: process.env.NEXT_PUBLIC_IMGBB_API_KEY },
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return response.data.data.url;
    } catch (error: any) {
      console.error("ImgBB Upload Error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      if (error.response) {
        switch (error.response.status) {
          case 400:
            throw new Error("Invalid upload request. Check file type and size.");
          case 401:
            throw new Error("ImgBB API key is invalid or missing.");
          case 500:
            throw new Error("ImgBB server error. Please try again later.");
          default:
            throw new Error("Image upload failed. Please try again.");
        }
      } else if (error.request) {
        throw new Error(
          "No response received from ImgBB. Check your internet connection."
        );
      } else {
        throw new Error("Error setting up image upload request.");
      }
    }
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        alert("Only JPEG, PNG, and GIF images are allowed");
        return;
      }

      if (file.size > maxSize) {
        alert("File size should not exceed 5MB");
        return;
      }

      try {
        setIsLoading(true);
        const downloadURL = await uploadToImgBB(file);

        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { profilePicUrl: downloadURL });

        setProfilePicUrl(downloadURL);
        setUser((prevUser) =>
          prevUser ? { ...prevUser, profilePicUrl: downloadURL } : null
        );
      } catch (error: any) {
        alert(error.message || "Failed to upload profile picture");
        console.error("Profile Picture Upload Error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditInterests = () => {
    setIsEditing(true);
  };

  const handleSaveInterests = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { interests: editedInterests });
      setUser({ ...user, interests: editedInterests });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating interests:", error);
    }
  };

  const handleAddInterest = (interest: string) => {
    if (!editedInterests.includes(interest)) {
      setEditedInterests([...editedInterests, interest]);
      setSearchTerm("");
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && searchTerm.trim() !== "") {
      e.preventDefault();
      handleAddInterest(searchTerm);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
    } 
  };

  const handleRemoveInterest = (interest: string) => {
    if (interest === "MBCET") return;
    setEditedInterests(editedInterests.filter((i) => i !== interest));
  };

  const handleProfilePicClick = () => {
    fileInputRef.current?.click();
  };

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 border border-gray-200 border-t-blue-500 animate-spin shadow-sm"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="card-brutal bg-white p-8 relative">
        <div className="hero-corner-tl" />
        <div className="hero-corner-tr" />
        <div className="hero-corner-bl" />
        <div className="hero-corner-br" />

        {/* Profile Picture Section */}
        <div className="mb-10 flex flex-col items-center sm:flex-row pb-8 border-b border-gray-200">
          <div
            className="group relative mb-6 h-32 w-32 cursor-pointer sm:mb-0 sm:mr-8 border border-gray-200 shadow-sm shrink-0 bg-white overflow-hidden hover:scale-105 transition-transform"
            onClick={handleProfilePicClick}
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 z-10">
                <span className="heading-brutal text-white text-[10px]">UPLOADING...</span>
              </div>
            ) : profilePicUrl ? (
              <img
                src={profilePicUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-50">
                <span className="heading-brutal text-gray-900/50 text-sm">ADD PHOTO</span>
              </div>
            )}

            {/* Camera Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-8 w-8 text-white"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-5.5V13h4v1.5l3-3-3-3V10H10v1.5l-3 3z" />
              </svg>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleProfilePicChange}
            className="hidden"
            accept="image/*"
          />

          <div className="text-center sm:text-left">
            <h2 className="heading-brutal text-4xl uppercase mb-2">{user.name}</h2>
            <p className="subheading-brutal text-blue-600">USER ID: {user.userId}</p>
          </div>
        </div>

        {/* Interests Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="heading-brutal text-2xl uppercase">INTERESTS</h3>
            {!isEditing && (
              <button
                onClick={handleEditInterests}
                className="btn-secondary px-6 shrink-0"
              >
                EDIT INTERESTS
              </button>
            )}
          </div>
          
          {isEditing ? (
            <div className="card-brutal p-6 bg-white">
              <div className="mb-6 flex flex-wrap gap-3 border-b border-gray-200 pb-6">
                {editedInterests.map((interest, index) => (
                  <Pill
                    key={index}
                    text={interest}
                    type="delete"
                    onClick={() => handleRemoveInterest(interest)}
                  />
                ))}
              </div>
              <div className="relative mb-6">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ADD NEW INTEREST (PRESS ENTER)"
                  className="input-brutal w-full py-3"
                />
                {suggestions.length > 0 && (
                  <ul className="absolute z-20 mt-2 max-h-40 w-full overflow-y-auto card-brutal bg-white p-0 shadow-sm">
                    {suggestions.map((skill, index) => (
                      <li
                        key={index}
                        className={`cursor-pointer px-4 py-3 border-b border-gray-200 last:border-b-0 subheading-brutal hover:bg-gray-800/5 ${
                          index === selectedSuggestion ? "bg-cyan-100 text-cyan-800 text-white hover:bg-cyan-100 text-cyan-800 hover:text-white" : ""
                        }`}
                        onClick={() => handleAddInterest(skill)}
                        ref={(el: HTMLLIElement | null) => {
                          suggestionRef.current[index] = el;
                        }}
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary px-8 py-3"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveInterests}
                  className="btn-primary px-8 py-3"
                >
                  SAVE CHANGES
                </button>
              </div>
            </div>
          ) : (
            <div className="card-brutal p-6 bg-gray-50">
              {user.interests && user.interests.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {user.interests.map((interest, index) => (
                    <Pill key={index} text={interest} type="view" onClick={undefined} />
                  ))}
                </div>
              ) : (
                <div className="py-8 flex items-center justify-center border border-dashed border-gray-200/30">
                  <p className="heading-brutal text-gray-900/40 text-center">NO INTERESTS ADDED YET</p>
                </div>
              )}
            </div>
          )}

          {/* User Posts Section */}
          {userPosts.length > 0 && (
            <div className="mt-12 pt-10 border-t border-gray-200">
              <h3 className="heading-brutal text-2xl uppercase mb-6">YOUR POSTS</h3>
              <div className="grid gap-6 md:grid-cols-2">
                {userPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="card-brutal bg-white p-6 hover:-translate-y-1 hover:shadow-sm transition-all"
                  >
                    <h4 className="heading-brutal text-xl uppercase mb-3 line-clamp-1">{post.title}</h4>
                    <p className="text-gray-900 font-medium mb-6 line-clamp-3">{post.content}</p>
                    <div className="flex justify-between items-center mt-auto border-t border-gray-200 pt-4">
                      <div className="label-brutal text-gray-900/50">
                        POSTED ON {post.createdAt?.toDate().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
