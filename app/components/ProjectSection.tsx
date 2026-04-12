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
      className="card-brutal p-6 bg-white flex flex-col w-full hover:-translate-y-1 hover:shadow-md transition-all"
    >
      <div>
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-4">
          <h2 className="text-xl font-bold text-gray-900">{project.title}</h2>
          {isJoined ? (
            <span className="tag-brutal bg-green-100 text-green-800 text-xs">Joined</span>
          ) : (
            <button
              onClick={() => handleProjectJoin(project.id)}
              className="btn-primary py-1 px-4 text-sm"
            >
              Join Project
            </button>
          )}
        </div>
        <p className="text-gray-600 mb-6">{project.description}</p>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 flex-1 min-w-[120px] border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Status</span>
            <span className={`text-sm font-semibold capitalize ${
              project.status === 'planning' ? 'text-gray-700' :
              project.status === 'in-progress' ? 'text-blue-600' :
              'text-green-600'
            }`}>
              {project.status.replace('-', ' ')}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 flex-1 min-w-[120px] border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Members</span>
            <span className="text-sm font-semibold text-gray-900">
              {project.members.length}/{project.idealTeamSize}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Technologies</h3>
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((tech, index) => (
              <span
                key={index}
                className="tag-brutal font-medium text-xs bg-blue-50 text-blue-700"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Skills Needed</h3>
          <div className="flex flex-wrap gap-2">
            {project.skills.map((skill, index) => (
              <span
                key={index}
                className="tag-brutal font-medium text-xs bg-purple-50 text-purple-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {isJoined && user && (
          <div className="pt-4 border-t border-gray-200 border-dashed mt-auto">
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
      <div className="flex flex-col md:flex-row mb-8 justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('my')}
            className={`font-bold text-xl pb-2 transition-all ${
              activeTab === 'my' 
                ? 'border-b-2 border-blue-600 text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Projects
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`font-bold text-xl pb-2 transition-all ${
              activeTab === 'all' 
                ? 'border-b-2 border-blue-600 text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Projects
          </button>
        </div>
        <button
          onClick={() => setIsProjectModalOpen(true)}
          className="btn-primary"
        >
          Create New Project
        </button>
      </div>

      {activeTab === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
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