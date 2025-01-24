import React from "react";
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  arrayRemove 
} from "firebase/firestore";
import { Project } from "../types";
import { db } from "../lib/firebaseConfig";

interface ProjectManagementProps {
  project: Project;
  currentUserId: string;
  userName: string;
  onProjectUpdate: () => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({
  project,
  currentUserId,
  userName,
  onProjectUpdate
}) => {
  const isOwner = project.owner === currentUserId;

  const removeMember = async (memberToRemove: string) => {
    if (!isOwner) return;

    try {
      const projectRef = doc(db, "projects", project.id);
      await updateDoc(projectRef, {
        members: arrayRemove(memberToRemove)
      });
      onProjectUpdate();
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const deleteProject = async () => {
    if (!isOwner) return;

    try {
      const projectRef = doc(db, "projects", project.id);
      await deleteDoc(projectRef);
      onProjectUpdate();
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  return (
    <div className="mt-4">
      {isOwner && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Project Management</h3>
          <div className="flex flex-col space-y-2">
            <button 
              onClick={deleteProject}
              className="rounded bg-red-500 px-3 py-1 text-white"
            >
              Delete Project
            </button>
          </div>
          <div>
            <h4 className="font-medium mb-2">Members</h4>
            {project.members.map((member, index) => (
              <div 
                key={index} 
                className="flex justify-between items-center mb-2 bg-gray-100 p-2 rounded"
              >
                <div>
                  <span className="font-medium">{member}</span>
                  <span className="font-medium">     {project.userIds[index-1]}</span>
            
                </div>
                {member !== userName && (
                  <button 
                    onClick={() => removeMember(member)}
                    className="rounded bg-red-600 px-2 py-1 text-white text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;