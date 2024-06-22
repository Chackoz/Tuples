// components/Profile.tsx

import React, { useState, useEffect, useRef, KeyboardEventHandler } from 'react';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '../lib/firebaseConfig';
import { skills } from '../lib/skills';
import Pill from './ui/Pill';

interface ProfileProps {
  userId: string;
}

interface User {
  name: string;
  interests: string[];
  userId: string;
  // Add other user properties as needed
}

const Profile: React.FC<ProfileProps> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInterests, setEditedInterests] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const suggestionRef = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          setUser(userData);
          setEditedInterests(userData.interests || []);
        } else {
          console.log("No such user!");
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

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-md">
     
      <div className="mb-4 w-[40%] flex flex-col justify-between items-stretch">
        <p className='flex justify-between'><strong>Name:</strong> <span className='w-[50%]'>{user.name}</span></p>
        <p className='flex justify-between'><strong>User ID:</strong> <span className='w-[50%]'>{user.userId}</span></p>
      </div>
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">Interests</h3>
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
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add new interest"
              className="border rounded px-2 py-1 mb-2"
            />
            {suggestions.length > 0 && (
              <ul className="border rounded mt-1 max-h-40 overflow-y-auto">
                {suggestions.map((skill, index) => (
                  <li
                    key={index}
                    className={`px-2 py-1 cursor-pointer ${
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
            <button
              onClick={handleSaveInterests}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mx-2"
            >
              Save Interests
            </button>
          </div>
        ) : (
          <div>
           {user.interests && user.interests.length > 0 ? ( <div className="flex flex-wrap gap-2 mb-4">
              {user.interests.map((interest, index) => (
                <Pill key={index} text={interest} type="view" onClick={undefined} />
              ))}
            </div>): <p className='py-2'>No interests added yet.</p>}
            <button
              onClick={handleEditInterests}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 m-2"
            >
              Edit Interests
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
