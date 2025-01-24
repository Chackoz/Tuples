import React, { useState, useEffect, useRef, KeyboardEventHandler } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import { skills } from "../lib/skills";
import Pill from "./ui/Pill";
import axios from "axios";

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
          setUser(userData);
          setEditedInterests(userData.interests || []);
          setProfilePicUrl(userData.profilePicUrl);
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
    } else if (e.key === "Backspace" && searchTerm === "") {
      setEditedInterests((prev) => prev.slice(0, -1));
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setEditedInterests(editedInterests.filter((i) => i !== interest));
  };

  const handleProfilePicClick = () => {
    fileInputRef.current?.click();
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="rounded-lg bg-white p-6 shadow-md">
        {/* Profile Picture Section */}
        <div className="mb-6 flex flex-col items-center sm:flex-row">
          <div
            className="group relative mb-4 h-32 w-32 cursor-pointer overflow-hidden rounded-full sm:mb-0 sm:mr-6"
            onClick={handleProfilePicClick}
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <span className="text-white">Uploading...</span>
              </div>
            ) : profilePicUrl ? (
              <img
                src={profilePicUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200">
                <span className="text-gray-500">Add Photo</span>
              </div>
            )}

            {/* Camera Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-all duration-300 group-hover:bg-opacity-30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-8 w-8 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
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
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-gray-600">User ID: {user.userId}</p>
          </div>
        </div>
        {/* Interests Section */}
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold">Interests</h3>
          {isEditing ? (
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {editedInterests.map((interest, index) => (
                  <Pill
                    key={index}
                    text={interest}
                    type="delete"
                    onClick={() => handleRemoveInterest(interest)}
                  />
                ))}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add new interest"
                  className="mb-2 w-full rounded border px-3 py-2"
                />
                {suggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded border bg-white shadow-lg">
                    {suggestions.map((skill, index) => (
                      <li
                        key={index}
                        className={`cursor-pointer px-3 py-2 hover:bg-gray-100 ${
                          index === selectedSuggestion ? "bg-gray-200" : ""
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
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={handleSaveInterests}
                  className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                >
                  Save Interests
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {user.interests && user.interests.length > 0 ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {user.interests.map((interest, index) => (
                    <Pill key={index} text={interest} type="view" onClick={undefined} />
                  ))}
                </div>
              ) : (
                <p className="mb-4 text-gray-500">No interests added yet.</p>
              )}
              <button
                onClick={handleEditInterests}
                className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Edit Interests
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
