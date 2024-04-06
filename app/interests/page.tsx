"use client";
import React, { useEffect, useRef, useState, KeyboardEventHandler } from "react";
import Pill from "../components/ui/Pill";
import { skills, getRandomSkills } from "../lib/skills";

const Interests = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedSkillSet, setSelectedSkillSet] = useState<Set<string>>(new Set());
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<(HTMLLIElement | HTMLElement)[]>([]);
  const scrollableContainer = useRef<HTMLUListElement | null>();
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
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
      console.log("Selected Suggestion No is : ", selectedSuggestion);
      console.log(
        "Selected Suggestion is :",
        suggestionRef.current[selectedSuggestion]?.outerText
      );
      suggestionRef.current[selectedSuggestion]?.focus();
    } else if (e.key === "ArrowUp" && suggestions?.length > 0) {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
      console.log("Selected Suggestion No is : ", selectedSuggestion);
      console.log(
        "Selected Suggestion is :",
        suggestionRef.current[selectedSuggestion]?.outerText
      );
      suggestionRef.current[selectedSuggestion]?.focus();
    } else if (
      e.key === "Enter" &&
      selectedSuggestion >= 0 &&
      selectedSuggestion < suggestions.length
    ) {
      const skill: string | undefined =
        suggestionRef.current[selectedSuggestion]?.outerText;
      handleSelectUser(skill || "");
      setSelectedSuggestion(0);
    }
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-center ">
      <div className="flex h-fit w-1/2 flex-wrap items-center gap-2 rounded-xl border-2  border-[#ccc] px-3 py-2">
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
            className="outline-none"
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`${selectedSkills.length > 0 ? "" : "Type or Select from below"}`}
            onKeyDown={handleKeyDown}
          />
          {suggestions.length > 0 && (
            <ul
              ref={(el) => {
                if (el) {
                  scrollableContainer.current = el;
                }
              }}
              className=" absolute m-0 max-h-80 list-none overflow-y-scroll border-2  border-[#ccc] bg-white p-0 text-black"
            >
              {suggestions.map(
                (skill: string, index: number) =>
                  !selectedSkillSet.has(skill) && (
                    <li
                      ref={(el: HTMLLIElement | null) => {
                        if (el) {
                          suggestionRef.current[index] = el;
                        }
                      }}
                      className={`flex cursor-pointer items-center gap-3 border-b-2 border-[#ccc] px-2 py-3 text-black hover:bg-[#ccc] ${selectedSuggestion === index ? "bg-[#ccc]" : ""}`}
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

      <div className="flex max-h-72 w-1/2 flex-wrap gap-4 px-8 py-4">
        {skills
          .slice(0, 10)
          .map(
            (skill, index) =>
              !selectedSkills.includes(skill) && (
                <Pill
                  key={index}
                  type={"add"}
                  text={skill}
                  onClick={() => handleSelectUser(skill)}
                />
              )
          )}
      </div>

      <div className="text-md flex cursor-pointer  items-center justify-center rounded-full bg-blue-500 px-5 py-2 text-white">
        Confirm
      </div>
    </div>
  );
};

export default Interests;