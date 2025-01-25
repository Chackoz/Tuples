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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8">
        <h2 className="mb-6 text-2xl font-bold">Create New Project</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Project Title
              {errors.title && <span className="ml-2 text-red-500">{errors.title}</span>}
            </label>
            <input
              type="text"
              name="title"
              value={projectData.title}
              onChange={handleInputChange}
              className={`mt-1 block w-full rounded-md border ${
                errors.title ? "border-red-500" : "border-gray-300"
              } p-2 shadow-sm`}
              placeholder="Enter project title"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Description
              {errors.description && (
                <span className="ml-2 text-red-500">{errors.description}</span>
              )}
            </label>
            <textarea
              name="description"
              value={projectData.description}
              onChange={handleInputChange}
              className={`mt-1 block w-full rounded-md border ${
                errors.description ? "border-red-500" : "border-gray-300"
              } p-2 shadow-sm`}
              rows={4}
              placeholder="Describe your project goals and vision"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Technologies (comma-separated)
              {errors.technologies && (
                <span className="ml-2 text-red-500">{errors.technologies}</span>
              )}
            </label>
            <input
              type="text"
              name="technologies"
              value={projectData.technologies}
              onChange={handleInputChange}
              className={`mt-1 block w-full rounded-md border ${
                errors.technologies ? "border-red-500" : "border-gray-300"
              } p-2 shadow-sm`}
              placeholder="React, Node.js, Firebase"
            />
          </div>

          
            <h3 className="mb-2 text-lg font-semibold">Required Skills</h3>
            
       

            {/* Skill Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add project skills"
                className="mb-2 w-full rounded border px-3 py-2"
              />

              {/* Skill Suggestions */}
              {suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded border bg-white shadow-lg">
                  {suggestions.map((skill, index) => (
                    <li
                      key={skill}
                      className={`cursor-pointer px-3 py-2 hover:bg-gray-100 ${
                        index === selectedSuggestion ? "bg-gray-200" : ""
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Selected Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {projectData.skills.map((skill) => (
                  <div 
                    key={skill} 
                    className="flex items-center bg-blue-100 rounded-full px-3 py-1 text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}


          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Ideal Team Size
            </label>
            <input
              type="number"
              name="idealTeamSize"
              value={projectData.idealTeamSize}
              onChange={handleInputChange}
              min={2}
              max={10}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Project Status
            </label>
            <select
              name="status"
              value={projectData.status}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
            >
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-gray-300 px-4 py-2 text-gray-700"
            >
              Cancel
            </button>
            <button type="submit" className="rounded bg-blue-500 px-4 py-2 text-white">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectCreationModal;