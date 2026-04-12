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
      className="card-brutal p-6 bg-white flex flex-col w-full hover:-translate-y-1 hover:shadow-[4px_4px_0px_#3b82f6] transition-all"
    >
      <div>
        <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-4">
          <h2 className="heading-brutal text-2xl text-black">{project.title}</h2>
          {isJoined ? (
            <span className="tag-brutal bg-green-300 text-sm">JOINED</span>
          ) : (
            <button
              onClick={() => handleProjectJoin(project.id)}
              className="btn-primary py-1 px-4 text-sm"
            >
              JOIN PROJECT
            </button>
          )}
        </div>
        <p className="font-medium text-black/80 mb-6">{project.description}</p>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="card-brutal bg-[#f0f0f0] p-3 shadow-none border-dashed border-2 flex-1 min-w-[120px]">
            <span className="label-brutal text-black/50 block mb-1">STATUS</span>
            <span className={`heading-brutal text-lg uppercase ${
              project.status === 'planning' ? 'text-black' :
              project.status === 'in-progress' ? 'text-blue-600' :
              'text-green-600'
            }`}>
              {project.status.replace('-', ' ')}
            </span>
          </div>

          <div className="card-brutal bg-[#f0f0f0] p-3 shadow-none border-dashed border-2 flex-1 min-w-[120px]">
            <span className="label-brutal text-black/50 block mb-1">MEMBERS</span>
            <span className="heading-brutal text-lg">
              {project.members.length}/{project.idealTeamSize}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="label-brutal text-sm mb-2 text-black/60">TECHNOLOGIES</h3>
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((tech, index) => (
              <span
                key={index}
                className="tag-brutal bg-blue-300 text-xs"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="label-brutal text-sm mb-2 text-black/60">SKILLS NEEDED</h3>
          <div className="flex flex-wrap gap-2">
            {project.skills.map((skill, index) => (
              <span
                key={index}
                className="tag-brutal bg-[#a78bfa] text-xs"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {isJoined && user && (
          <div className="pt-4 border-t-2 border-black border-dashed mt-auto">
            <ProjectManagement
              project={project}
              currentUserId={currentUserId}
              userName={user.name}
              onProjectUpdate={() => {
                fetchAllProjects();
                setState(prev => !prev);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row mb-8 justify-between items-start md:items-center gap-4 border-b-4 border-black pb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('my')}
            className={`heading-brutal text-xl pb-2 transition-all ${
              activeTab === 'my' 
                ? 'border-b-4 border-black text-black' 
                : 'text-black/40 hover:text-black/70'
            }`}
          >
            MY PROJECTS
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`heading-brutal text-xl pb-2 transition-all ${
              activeTab === 'all' 
                ? 'border-b-4 border-black text-black' 
                : 'text-black/40 hover:text-black/70'
            }`}
          >
            ALL PROJECTS
          </button>
        </div>
        <button
          onClick={() => setIsProjectModalOpen(true)}
          className="btn-primary"
        >
          CREATE NEW PROJECT
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
        userId={user.userId||""}
        onClose={() => setIsProjectModalOpen(false)}
        currentUserId={currentUserId}
        userName={user.name || ""}
      />
    </div>
  );
};

export default Projects;