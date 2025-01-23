"use client";
import React, { useEffect, useRef, useState, KeyboardEventHandler } from "react";
import { useRouter } from "next/navigation";
import Pill from "../../components/ui/Pill";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebaseConfig";
import { getRandomSkills, skills } from "../../lib/skills";
import { onAuthStateChanged } from "firebase/auth";
import NavBar from "@/app/components/NavBar";

const Interests: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedSkillSet, setSelectedSkillSet] = useState<Set<string>>(new Set());
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(0);
  const [skillsSug, setSkills] = useState<string[]>([]);

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
    setSkills(getRandomSkills(20));

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
    <div className="relative flex min-h-screen w-full flex-col items-center bg-[#f0f0f0]">
      <NavBar />
      <div className="w-full max-w-[70vw] px-4 py-8 md:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold text-[#2b2b2b] md:text-3xl">
          Choose Your Interests
        </h1>

        <div className="mb-6 rounded-xl border-2 border-[#d0d0d0] bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            {selectedSkills.map((skill, index) => (
              <Pill
                key={index}
                text={skill}
                type="delete"
                onClick={() => handleRemoveSkill(skill)}
              />
            ))}
            <div className="relative flex-1">
              <input
                className="w-full bg-white  outline-none"
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
                  className="custom-scrollbar absolute left-0 top-full z-10 max-h-[40vh] w-full overflow-y-auto rounded-md border-2 border-[#d0d0d0] bg-white"
                >
                  {suggestions.map(
                    (skill, index) =>
                      !selectedSkillSet.has(skill) && (
                        <li
                          ref={(el) => {
                            suggestionRef.current[index] = el;
                          }}
                          className={`cursor-pointer px-3 py-2 hover:bg-[#f0f0f0] ${
                            selectedSuggestion === index ? "bg-[#f0f0f0]" : ""
                          }`}
                          key={index}
                          onClick={() => handleSelectSkill(skill)}
                        >
                          {skill}
                        </li>
                      )
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 hidden flex-wrap gap-2 md:flex">
          {skillsSug
            .slice(0, 20)
            .filter((skill) => !selectedSkills.includes(skill))
            .map((skill, index) => (
              <Pill
                key={index}
                type="add"
                text={skill}
                onClick={() => handleSelectSkill(skill)}
              />
            ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2 md:hidden">
          {skillsSug
            .slice(0, 10)
            .filter((skill) => !selectedSkills.includes(skill))
            .map((skill, index) => (
              <Pill
                key={index}
                type="add"
                text={skill}
                onClick={() => handleSelectSkill(skill)}
              />
            ))}
        </div>

        <div
          onClick={handleClick}
          className="mx-auto w-full max-w-xs cursor-pointer rounded-full bg-[#3c82f5] px-6 py-3 text-center text-white transition-colors hover:bg-[#2c72e5]"
        >
          Confirm
        </div>
      </div>
    </div>
  );
};

export default Interests;
