"use client";
import React, { useEffect, useRef, useState, KeyboardEventHandler } from "react";
import Pill from "../components/ui/Pill";
import { skills } from "../lib/skills";

const Interests = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedSkillSet, setSelectedSkillSet] = useState<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSkills = () => {
      if (searchTerm.trim() === "") {
        return;
      }
      const matchingSkills = skills.filter((skill) =>
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(matchingSkills);
    };
    fetchSkills();
  }, [searchTerm]);

  const handleSelectUser = (skill: string) => {
    setSelectedSkills([...selectedSkills, skill]);
    setSelectedSkillSet(new Set([...selectedSkillSet, skill]));
    setSearchTerm("");
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.focus();
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
    }
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-center">
      <div className="flex h-fit w-1/2 flex-wrap items-center gap-2 rounded-xl border-2  border-[#ccc] px-3 py-2">
        {selectedSkills.map((skill, index) => (
          <Pill key={index} text={skill} onClick={() => handleRemoveSkill(skill)} />
        ))}
        <div className="text-black">
          <input
            className="outline-none"
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`${selectedSkills.length > 0 ? "" : "Search for your interests"}`}
            onKeyDown={handleKeyDown}
          />
          {suggestions.length > 0 && (
            <ul className=" absolute m-0 max-h-80 list-none overflow-y-scroll border-2  border-[#ccc] bg-white p-0 text-black">
              {suggestions.map(
                (skill: string, index: number) =>
                  !selectedSkillSet.has(skill) && (
                    <li
                      className=" flex cursor-pointer items-center gap-3 border-b-2 border-[#ccc] px-2 py-3 text-black hover:bg-[#ccc]"
                      key={index}
                      onClick={() => {
                        handleSelectUser(skill);
                      }}
                    >
                      <span>{skill}</span>
                    </li>
                  )
              )}
            </ul>
          )}
        </div>
      </div>
      {/*Suggestions Fixed*/}
      <div className="h-60 bg-emerald-500"></div>
      <div className="text-md flex cursor-pointer  items-center justify-center rounded-full bg-blue-500 px-5 py-2 text-white">
        Confirm
      </div>
    </div>
  );
};

export default Interests;
