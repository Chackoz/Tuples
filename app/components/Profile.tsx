import React, { useState, useEffect, useRef, KeyboardEventHandler } from 'react';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '../lib/firebaseConfig';
import { skills } from '../lib/skills';
import Pill from './ui/Pill';
import axios from 'axios';

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
    formData.append('image', file);
    
    try {
      const response = await axios.post(
        `https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data.data.url;
    } catch (error) {
      console.error("Error uploading to ImgBB:", error);
      throw error;
    }
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsLoading(true);
        const downloadURL = await uploadToImgBB(file);
        
        // Update Firestore with the new profile pic URL
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { profilePicUrl: downloadURL });
        
        // Update local state
        setProfilePicUrl(downloadURL);
        setUser(prevUser => prevUser ? {...prevUser, profilePicUrl: downloadURL} : null);
      } catch (error) {
        console.error("Error uploading profile picture:", error);
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
      setSelectedSuggestion((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestion((prev) =>
        prev > 0 ? prev - 1 : 0
      );
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
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="bg-white rounded-lg p-6 shadow-md">
        {/* Profile Picture Section */}
        <div className="flex flex-col sm:flex-row items-center mb-6">
          <div 
            className="w-32 h-32 rounded-full overflow-hidden mb-4 sm:mb-0 sm:mr-6 cursor-pointer relative"
            onClick={handleProfilePicClick}
          >
            {isLoading ? (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-white">Uploading...</span>
              </div>
            ) : profilePicUrl ? (
              <img 
                src={profilePicUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Add Photo</span>
              </div>
            )}
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
          <h3 className="text-lg font-semibold mb-4">Interests</h3>
          {isEditing ? (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
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
                  className="w-full border rounded px-3 py-2 mb-2"
                />
                {suggestions.length > 0 && (
                  <ul className="absolute z-10 w-full border rounded mt-1 max-h-40 overflow-y-auto bg-white shadow-lg">
                    {suggestions.map((skill, index) => (
                      <li
                        key={index}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
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
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={handleSaveInterests}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Save Interests
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {user.interests && user.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {user.interests.map((interest, index) => (
                    <Pill key={index} text={interest} type="view" onClick={undefined} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 mb-4">No interests added yet.</p>
              )}
              <button
                onClick={handleEditInterests}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
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