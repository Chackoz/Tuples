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
    <div className="user-search-container">
      <div className="user-search-input">
        {selectedSkills.map((skill, index) => (
          <Pill key={index} text={skill} onClick={() => handleRemoveSkill(skill)} />
        ))}
        <div className="text-black">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for your interests"
            onKeyDown={handleKeyDown}
          />
          <ul className="suggestions-list text-black">
            {suggestions.map(
              (skill: string, index: number) =>
                !selectedSkillSet.has(skill) && (
                  <li
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
        </div>
      </div>
    </div>
  );
};

export default Interests;
