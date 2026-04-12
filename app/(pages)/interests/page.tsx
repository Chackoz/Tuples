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
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["MBCET"]);
  const [selectedSkillSet, setSelectedSkillSet] = useState<Set<string>>(new Set(["MBCET"]));
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
    // Prevent removing MBCET
    if (skillToRemove === "MBCET") return;

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
      selectedSkills.length > 1 // Changed to prevent removing MBCET
    ) {
      const lastSkill = selectedSkills[selectedSkills.length - 1];
      if (lastSkill !== "MBCET") {
        handleRemoveSkill(lastSkill);
      }
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
    <div className="relative flex min-h-screen w-full flex-col items-center bg-gray-50">
      
      <div className="z-10 w-full p-4 md:p-8  mx-auto">
        <NavBar />
      </div>
      
      <div className="z-10 w-full max-w-[70vw] px-4 py-8 md:px-6 lg:px-8 card-brutal bg-white mt-8 relative">
        {/* Corner accents */}
        <div className="hero-corner-tl" />
        <div className="hero-corner-tr" />
        <div className="hero-corner-bl" />
        <div className="hero-corner-br" />

        <h1 className="heading-brutal mb-8 text-3xl md:text-4xl text-center uppercase">
          CHOOSE YOUR INTERESTS
        </h1>

        <div className="mb-8 card-brutal p-6 bg-white">
          <div className="flex flex-wrap items-center gap-3">
            {selectedSkills.map((skill, index) => (
              <Pill
                key={index}
                text={skill}
                type={skill === "MBCET" ? "default" : "delete"}
                onClick={() => skill !== "MBCET" && handleRemoveSkill(skill)}
              />
            ))}
            <div className="relative flex-1 min-w-[200px]">
              <input
                className="input-brutal w-full bg-white text-base md:text-lg py-3 px-4"
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`${selectedSkills.length > 1 ? "TYPE HERE..." : "TYPE OR SELECT FROM BELOW"}`}
                onKeyDown={handleKeyDown}
              />
              {suggestions.length > 0 && (
                <ul
                  ref={scrollableContainer}
                  className="custom-scrollbar absolute left-0 top-full z-20 max-h-[40vh] w-full overflow-y-auto card-brutal bg-white mt-2 p-0 shadow-sm"
                >
                  {suggestions.map(
                    (skill, index) =>
                      !selectedSkillSet.has(skill) && (
                        <li
                          ref={(el) => {
                            suggestionRef.current[index] = el;
                          }}
                          className={`cursor-pointer px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-800/5 heading-brutal block text-sm ${
                            selectedSuggestion === index ? "bg-cyan-100 text-cyan-800 text-white" : ""
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

        <div className="mb-10 hidden flex-wrap gap-3 md:flex">
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

        <div className="mb-10 flex flex-wrap gap-3 md:hidden">
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

        <div className="flex justify-center mt-4">
          <button
            onClick={handleClick}
            className="btn-primary w-full md:w-auto px-16 py-4 text-xl mx-auto"
          >
            CONFIRM INTERESTS
          </button>
        </div>
      </div>
    </div>
  );
};

export default Interests;