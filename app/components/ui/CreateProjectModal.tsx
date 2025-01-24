"use client";
import React, { useState, useCallback } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  userName: string;
}

const ProjectCreationModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  userName
}) => {
  const [projectData, setProjectData] = useState({
    title: "",
    description: "",
    technologies: "",
    skills: "",
    idealTeamSize: 3,
    status: "planning" as "planning" | "in-progress" | "completed"
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProjectData((prev) => ({
      ...prev,
      [name]: value
    }));
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
        technologies: projectData.technologies.split(",").map((tech) => tech.trim()),
        skills: projectData.skills.split(",").map((skill) => skill.trim()),
        createdAt: serverTimestamp(),
        idealTeamSize: Number(projectData.idealTeamSize)
      };

      const projectRef = await addDoc(collection(db, "projects"), projectToCreate);

      // Reset form and close modal
      setProjectData({
        title: "",
        description: "",
        technologies: "",
        skills: "",
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

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Required Skills (comma-separated)
            </label>
            <input
              type="text"
              name="skills"
              value={projectData.skills}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
              placeholder="UI/UX, Backend Development, DevOps"
            />
          </div>

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