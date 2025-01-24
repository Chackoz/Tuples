import React, { useState } from "react";
import { useProject } from "@/app/hooks/useProject";
import { User, Project } from "@/app/types";
import ProjectCreationModal from "@/app/components/ui/CreateProjectModal";
import ProjectManagement from "@/app/components/ProjectManagement";

interface ProjectsProps {
  allProjects: Project[];
  user: User;
  currentUserId: string;
  fetchAllProjects: () => Promise<Project[]>; // Updated type
  setState: React.Dispatch<React.SetStateAction<boolean>>;
}

const Projects: React.FC<ProjectsProps> = ({
  allProjects,
  user,
  currentUserId,
  fetchAllProjects,
  setState
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('my');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const { joinProject } = useProject();

  // Projects the user has joined
  const myProjects = allProjects.filter((project) => 
    project.members.includes(user?.name || "")
  );

  // Projects the user can join
  const availableProjects = allProjects.filter((project) => 
    !project.members.includes(user?.name || "")
  );

  const handleProjectJoin = async (projectId: string) => {
    await joinProject(projectId, user, () => {
      setState(prev => !prev);
    });
  };

  const renderProjectCard = (project: Project, isJoined: boolean) => (
    <div
      key={project.id}
      className="flex flex-col rounded-lg border bg-white shadow-md transition-shadow hover:shadow-lg w-fit md:min-w-[300px]"
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-gray-800">{project.title}</h2>
          {isJoined ? (
            <span className="text-green-600 font-semibold text-sm">Joined</span>
          ) : (
            <button
              onClick={() => handleProjectJoin(project.id)}
              className="rounded bg-blue-500 px-3 py-1 text-sm font-bold text-white hover:bg-blue-600"
            >
              Join Project
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-2">{project.description}</p>
        
        <div className="mb-2">
          <span className="text-sm text-gray-500">Status: </span>
          <span className={`text-sm font-semibold ${
            project.status === 'planning' ? 'text-yellow-600' :
            project.status === 'in-progress' ? 'text-blue-600' :
            'text-green-600'
          }`}>
            {project.status.replace('-', ' ')}
          </span>
        </div>

        <div className="mb-2">
          <p className="text-sm text-gray-500">Members: {project.members.length}/{project.idealTeamSize}</p>
        </div>

        <div className="mb-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Technologies:</h3>
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((tech, index) => (
              <span
                key={index}
                className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Skills Needed:</h3>
          <div className="flex flex-wrap gap-2">
            {project.skills.map((skill, index) => (
              <span
                key={index}
                className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {isJoined && user && (
          <ProjectManagement
            project={project}
            currentUserId={currentUserId}
            userName={user.name}
            onProjectUpdate={() => {
              fetchAllProjects();
              setState(prev => !prev);
            }}
         
          />
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex mb-6 justify-between items-center border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 ${activeTab === 'my' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500'}`}
          >
            My Projects
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 ${activeTab === 'all' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500'}`}
          >
            All Projects
          </button>
        </div>
        <button
          onClick={() => setIsProjectModalOpen(true)}
          className="rounded bg-blue-500 px-4 py-2 text-white text-sm"
        >
          Create New Project
        </button>
      </div>

      {activeTab === 'all' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableProjects.length > 0 ? (
            availableProjects.map(project => renderProjectCard(project, false))
          ) : (
            <p className="text-gray-500 col-span-full text-center">
              No available projects to join
            </p>
          )}
        </div>
      )}

      {activeTab === 'my' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myProjects.length > 0 ? (
            myProjects.map(project => renderProjectCard(project, true))
          ) : (
            <p className="text-gray-500 col-span-full text-center">
              You haven&apos;t joined any projects yet
            </p>
          )}
        </div>
      )}

      <ProjectCreationModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        currentUserId={currentUserId}
        userName={user.name || ""}
      />
    </div>
  );
};

export default Projects;