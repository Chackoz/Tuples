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

interface MemberDetail {
  name: string;
  userId: string;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({
  project,
  currentUserId,
  userName,
  onProjectUpdate
}) => {
  const isOwner = project.owner === currentUserId;

  // Create a more robust mapping of members to their user IDs
  const memberDetails: MemberDetail[] = project.members.map((name) => {
    // Find the corresponding userId for this member name
    const userIdIndex = project.members.indexOf(name);
    return {
      name: name,
      userId: project.userIds[userIdIndex] || ''
    };
  });

  const removeMember = async (memberToRemove: string) => {
    if (!isOwner) return;

    try {
      const projectRef = doc(db, "projects", project.id);
      
      // Remove both the member name and corresponding user ID
      const updatedMembers = project.members.filter(m => m !== memberToRemove);
      const updatedUserIds = project.userIds.filter((_, index) => 
        project.members[index] !== memberToRemove
      );

      await updateDoc(projectRef, {
        members: updatedMembers,
        userIds: updatedUserIds
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
            {memberDetails.map((member) => (
              <div 
                key={member.userId || member.name} 
                className="flex justify-between items-center mb-2 bg-gray-100 p-2 rounded"
              >
                <div className="flex flex-col justify-start items-start">
                  <span className="font-medium">{member.name}</span>
                  {member.userId && (
                    <div className="text-sm text-gray-500 ">({member.userId})</div >
                  )}
                </div>
                {member.name !== userName && (
                  <button 
                    onClick={() => removeMember(member.name)}
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