import { Project } from "@/app/types";
import React, { useState } from "react";

interface Community {
  id: string;
  name: string;
  creator: string;
  members: string[];
}

interface CommunityBoxProps {
  community?: Community;
  project?: Project;
}

function Modal({
  show,
  onClose,
  community,
  project
}: {
  show: boolean;
  onClose: () => void;
  community?: Community;
  project?: Project;
}) {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      {community && (
        <div className="w-[30vw] rounded-lg bg-white p-4">
          <h2 className="mb-2 text-2xl font-bold">{community.name}</h2>
          <p>
            <strong>Creator:</strong> {community.creator}
          </p>
          <p>
            <strong>Invite Code:</strong> {community.id}
          </p>
          <p>
            <strong>Members: {community.members.length}</strong>
          </p>
          <div className="">
            <ul className="custom-scrollbar ml-5 max-h-[150px] list-disc overflow-y-auto">
              {community.members.map((member, index) => (
                <li key={index}>
                  {index + 1} {member}
                </li>
              ))}
            </ul>
          </div>
          <button
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      )}
      {project && (
        <div className="w-[30vw] rounded-lg bg-white p-4">
          <h2 className="mb-2 text-2xl font-bold">{project.title}</h2>
          <p>
            <strong>Creator:</strong> {project.description}
          </p>
          <p>
            <strong>Invite Code:</strong> {project.id}
          </p>
          <p>
            <strong>Members: {project.members.length}</strong>
          </p>
          <div className="">
            <ul className="custom-scrollbar ml-5 max-h-[150px] list-disc overflow-y-auto">
              {project.members.map((member, index) => (
                <li key={index}>
                  {index + 1} {member}
                </li>
              ))}
            </ul>
          </div>
          <button
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

function CommunityBox({ community, project }: CommunityBoxProps) {
  const [isModalOpen, setModalOpen] = useState(false);

  const handleBoxClick = () => {
    if (community) {
      setModalOpen(true);
    }
    if (project) {
      console.log("Project Box Clicked");
      setModalOpen(true);
    }
  };

  return (
    <>
      <div
        className="flex h-[5vw] w-[5vw] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg bg-[#eeeeee] p-2"
        onClick={handleBoxClick}
      >
        {community ? (
          <>
            <h3 className="w-full truncate text-center text-[0.8vw] font-semibold">
              {community.name}
            </h3>
            <p className="text-[0.6vw] text-gray-500">
              {community.members.length} members
            </p>
          </>
        ) : (
          <div></div>
        )}
        {project ? (
          <>
            <h3 className="w-full truncate text-center text-[0.8vw] font-semibold">
              {project.title}
            </h3>
            <p className="text-[0.6vw] text-gray-500">{project.members.length} members</p>
          </>
        ) : (
          <div></div>
        )}
      </div>

      {community && (
        <Modal
          show={isModalOpen}
          onClose={() => setModalOpen(false)}
          community={community}
        />
      )}
      {project && (
        <Modal show={isModalOpen} onClose={() => setModalOpen(false)} project={project} />
      )}
    </>
  );
}

export default CommunityBox;
