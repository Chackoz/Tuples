"use client";
import React, { useEffect, useRef, useState, KeyboardEventHandler } from "react";
import { useRouter } from "next/navigation";
import Pill from "../../components/ui/Pill";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebaseConfig";
import { skills } from "../../lib/skills";
import { onAuthStateChanged } from "firebase/auth";
import NavBar from "@/app/components/NavBar";

const Interests: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedSkillSet, setSelectedSkillSet] = useState<Set<string>>(new Set());
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(0);

  const [currentUser, fetchUserInfo] = useState("");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<(HTMLLIElement | null)[]>([]);
  const scrollableContainer = useRef<HTMLUListElement | null>(null);

  const router = useRouter();

  useEffect(() => {
    const subscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? undefined);
      if (user?.uid) {
        fetchUserInfo(user.uid);
      }
    });

    return () => subscribe();
  }, [fetchUserInfo]);

  useEffect(() => {
    const fetchSkills = () => {
      if (searchTerm.trim() === "") {
        setSuggestions([]);
        return;
      }
      const matchingSkills = skills.filter((skill) =>
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(matchingSkills);
    };
    fetchSkills();
  }, [searchTerm]);

  const handleSelectSkill = (skill: string) => {
    if (!selectedSkillSet.has(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
      setSelectedSkillSet(new Set([...selectedSkillSet, skill]));
      setSearchTerm("");
      setSuggestions([]);
      setSelectedSuggestion(0);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = selectedSkills.filter((skill) => skill !== skillToRemove);
    setSelectedSkills(updatedSkills);
    const updatedSkillSet = new Set(selectedSkillSet);
    updatedSkillSet.delete(skillToRemove);
    setSelectedSkillSet(updatedSkillSet);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (
      e.key === "Backspace" &&
      e.currentTarget.value === "" &&
      selectedSkills.length > 0
    ) {
      const lastSkill = selectedSkills[selectedSkills.length - 1];
      handleRemoveSkill(lastSkill);
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
      suggestionRef.current[selectedSuggestion]?.focus();
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
      suggestionRef.current[selectedSuggestion]?.focus();
    } else if (e.key === "Enter") {
      const selectedSkill = suggestions[selectedSuggestion];
      const skill = selectedSkill ? selectedSkill : searchTerm;
      if (skill && !selectedSkillSet.has(skill)) {
        handleSelectSkill(skill);
      }
    }
  };

  const handleClick = async () => {
    if (!userId) {
      console.error("User ID is undefined");
      return;
    }

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { interests: selectedSkills });
      router.push("/home");
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-between bg-[#ebebeb]">
     <NavBar/>
      <div className="w-[60vw] flex flex-col justify-center items-center mx-auto">
      <h1 className="text-[1.5vw] p-5  text-start w-full">Choose Your Interests</h1>
      <div className="flex h-fit w-[90%] flex-wrap items-center gap-2 rounded-xl border-2 border-[#ccc] px-3 py-2">
        {selectedSkills.map((skill, index) => (
          <Pill
            key={index}
            text={skill}
            type={"delete"}
            onClick={() => handleRemoveSkill(skill)}
          />
        ))}
        <div className="text-black">
          <input
            className="outline-none bg-[#ebebeb] p-2 "
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`${selectedSkills.length > 0 ? "" : "Type or Select from below"}`}
            onKeyDown={handleKeyDown}
          />
          {suggestions.length > 0 && (
            <ul
              ref={scrollableContainer}
              className="absolute m-0 max-h-80 list-none overflow-y-scroll border-2 border-[#ccc] bg-white p-0 text-black"
            >
              {suggestions.map(
                (skill, index) =>
                  !selectedSkillSet.has(skill) && (
                    <li
                      ref={(el) => {
                        suggestionRef.current[index] = el;
                      }}
                      className={`flex cursor-pointer items-center gap-3 border-b-2 border-[#ccc] px-2 py-3 text-black hover:bg-[#ccc] ${
                        selectedSuggestion === index ? "bg-[#ccc]" : ""
                      }`}
                      key={index}
                      onClick={() => handleSelectSkill(skill)}
                    >
                      <span>{skill}</span>
                    </li>
                  )
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="flex max-h-72 w-[80%] flex-wrap gap-4 px-8 py-4">
        {skills
          .slice(0, 10)
          .map(
            (skill, index) =>
              !selectedSkills.includes(skill) && (
                <Pill
                  key={index}
                  type={"add"}
                  text={skill}
                  onClick={() => handleSelectSkill(skill)}
                />
              )
          )}
      </div>

      <div
        onClick={handleClick}
        className="text-md flex cursor-pointer items-center justify-center rounded-full bg-blue-500 px-5 py-2 text-white"
      >
        Confirm
      </div>
      </div>
      <div> </div>
    </div>
  );
};

export default Interests;
