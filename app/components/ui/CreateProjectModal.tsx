"use client";
import React, { useState, useCallback, KeyboardEventHandler, useRef, useEffect } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { skills } from "../../lib/skills"; 
import { user } from "firebase-functions/v1/auth";



interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  userName: string;
  userId:string;
}

const ProjectCreationModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentUserId,
  userName
}) => {
  const [projectData, setProjectData] = useState({
    title: "",
    description: "",
    technologies: "",
    skills: [] as string[],
    customSkill: "",
    idealTeamSize: 3,
    status: "planning" as "planning" | "in-progress" | "completed"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const suggestionRef = useRef<(HTMLLIElement | null)[]>([]);


  const removeSkill = (skillToRemove: string) => {
    setProjectData((prev) => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProjectData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSkill = (skill: string) => {
    if (!projectData.skills.includes(skill)) {
      setProjectData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
      setSearchTerm("");
    }
  };


  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && searchTerm.trim() !== "") {
      e.preventDefault();
      handleAddSkill(searchTerm);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestion((prev) => 
        (prev < suggestions.length - 1 ? prev + 1 : prev)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
    } 
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!projectData.title.trim()) {
      newErrors.title = "Project title is required";
    }

    if (!projectData.description.trim()) {
      newErrors.description = "Project description is required";
    }

    if (!projectData.technologies.trim()) {
      newErrors.technologies = "At least one technology is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    

    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const projectToCreate = {
        ...projectData,
        owner: currentUserId,
        members: [userName],
        userIds: [userId],
        technologies: projectData.technologies.split(",").map((tech) => tech.trim()),
        createdAt: serverTimestamp(),
        idealTeamSize: Number(projectData.idealTeamSize)
      };

      await addDoc(collection(db, "projects"), projectToCreate);

      // Reset form
      setProjectData({
        title: "",
        description: "",
        technologies: "",
        skills: [],
        customSkill: "",
        idealTeamSize: 3,
        status: "planning"
      });
      onClose();
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl card-brutal bg-white p-8 relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border border-gray-200 bg-white hover:bg-red-400 transition-colors shadow-sm"
        >
          ✕
        </button>
        <h2 className="mb-6 heading-brutal text-2xl flex items-center gap-2">
          CREATE NEW PROJECT
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block label-brutal text-sm mb-2">
              PROJECT TITLE
              {errors.title && <span className="ml-2 text-red-500 bg-red-100 px-1 border border-gray-200">{errors.title}</span>}
            </label>
            <input
              type="text"
              name="title"
              value={projectData.title}
              onChange={handleInputChange}
              className={`input-brutal w-full ${
                errors.title ? "border-red-500 bg-red-50" : ""
              }`}
              placeholder="Enter project title"
            />
          </div>

          <div>
            <label className="block label-brutal text-sm mb-2">
              DESCRIPTION
              {errors.description && (
                <span className="ml-2 text-red-500 bg-red-100 px-1 border border-gray-200">{errors.description}</span>
              )}
            </label>
            <textarea
              name="description"
              value={projectData.description}
              onChange={handleInputChange}
              className={`input-brutal w-full min-h-[100px] resize-y ${
                errors.description ? "border-red-500 bg-red-50" : ""
              }`}
              rows={4}
              placeholder="Describe your project goals and vision"
            />
          </div>

          <div>
            <label className="block label-brutal text-sm mb-2">
              TECHNOLOGIES (COMMA-SEPARATED)
              {errors.technologies && (
                <span className="ml-2 text-red-500 bg-red-100 px-1 border border-gray-200">{errors.technologies}</span>
              )}
            </label>
            <input
              type="text"
              name="technologies"
              value={projectData.technologies}
              onChange={handleInputChange}
              className={`input-brutal w-full ${
                errors.technologies ? "border-red-500 bg-red-50" : ""
              }`}
              placeholder="React, Node.js, Firebase"
            />
          </div>

          <div>
            <h3 className="label-brutal text-sm mb-2">REQUIRED SKILLS</h3>
            
            {/* Skill Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add project skills"
                className="input-brutal w-full mb-2"
              />

              {/* Skill Suggestions */}
              {suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto border border-gray-200 bg-white shadow-sm">
                  {suggestions.map((skill, index) => (
                    <li
                      key={skill}
                      className={`cursor-pointer px-4 py-2 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors ${
                        index === selectedSuggestion ? "bg-yellow-200" : ""
                      }`}
                      onClick={() => handleAddSkill(skill)}
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

          {projectData.skills.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {projectData.skills.map((skill) => (
                  <div 
                    key={skill} 
                    className="tag-brutal bg-[#a78bfa] flex items-center gap-2"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-900 font-bold bg-white/50 w-5 h-5 flex items-center justify-center border border-gray-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block label-brutal text-sm mb-2">
                IDEAL TEAM SIZE
              </label>
              <input
                type="number"
                name="idealTeamSize"
                value={projectData.idealTeamSize}
                onChange={handleInputChange}
                min={2}
                max={10}
                className="input-brutal w-full"
              />
            </div>

            <div>
              <label className="block label-brutal text-sm mb-2">
                PROJECT STATUS
              </label>
              <select
                name="status"
                value={projectData.status}
                onChange={handleInputChange}
                className="input-brutal w-full bg-white"
              >
                <option value="planning">PLANNING</option>
                <option value="in-progress">IN PROGRESS</option>
                <option value="completed">COMPLETED</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              CANCEL
            </button>
            <button type="submit" className="btn-primary">
              CREATE PROJECT
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectCreationModal;