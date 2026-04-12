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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      {community && (
        <div className="w-[30vw] min-w-[300px] card-brutal bg-white p-6 relative">
          <h2 className="heading-brutal mb-4 text-2xl uppercase border-b-2 border-black pb-2">{community.name}</h2>
          <div className="space-y-3 mb-6">
            <p className="subheading-brutal text-black/70">
              <span className="text-black">CREATOR:</span> {community.creator}
            </p>
            <p className="subheading-brutal text-black/70">
              <span className="text-black">INVITE CODE:</span> {community.id}
            </p>
            <div className="tag-brutal inline-block bg-pink-300 shadow-[2px_2px_0px_#000]">
              MEMBERS: {community.members.length}
            </div>
          </div>
          <div className="mb-6 card-brutal p-4 bg-[#f0f0f0]">
            <ul className="custom-scrollbar ml-5 max-h-[150px] list-disc overflow-y-auto label-brutal text-black/70">
              {community.members.map((member, index) => (
                <li key={index} className="py-1 border-b border-black/10 last:border-0">
                  {member}
                </li>
              ))}
            </ul>
          </div>
          <button
            className="btn-secondary w-full py-3"
            onClick={onClose}
          >
            CLOSE
          </button>
        </div>
      )}
      {project && (
        <div className="w-[30vw] min-w-[300px] card-brutal bg-white p-6 relative">
          <h2 className="heading-brutal mb-4 text-2xl uppercase border-b-2 border-black pb-2">{project.title}</h2>
          <div className="space-y-3 mb-6">
            <p className="subheading-brutal text-black/70 break-words">
              <span className="text-black">DESCRIPTION:</span> {project.description}
            </p>
            <p className="subheading-brutal text-black/70">
              <span className="text-black">INVITE CODE:</span> {project.id}
            </p>
            <div className="tag-brutal inline-block bg-blue-300 shadow-[2px_2px_0px_#000]">
              MEMBERS: {project.members.length}
            </div>
          </div>
          <div className="mb-6 card-brutal p-4 bg-[#f0f0f0]">
            <ul className="custom-scrollbar ml-5 max-h-[150px] list-disc overflow-y-auto label-brutal text-black/70">
              {project.members.map((member, index) => (
                <li key={index} className="py-1 border-b border-black/10 last:border-0">
                  {member}
                </li>
              ))}
            </ul>
          </div>
          <button
            className="btn-secondary w-full py-3"
            onClick={onClose}
          >
            CLOSE
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
        className="flex h-24 w-24 md:h-32 md:w-32 cursor-pointer flex-col items-center justify-center overflow-hidden card-brutal bg-white hover:shadow-[4px_4px_0px_#3b82f6] hover:-translate-y-1 transition-all p-3 text-center shrink-0"
        onClick={handleBoxClick}
      >
        {community ? (
          <>
            <h3 className="w-full truncate text-[11px] md:text-sm heading-brutal uppercase text-black">
              {community.name}
            </h3>
            <p className="text-[9px] md:text-xs label-brutal text-black/50 mt-2">
              {community.members.length} MEMBERS
            </p>
          </>
        ) : (
          <div></div>
        )}
        {project ? (
          <>
            <h3 className="w-full truncate text-[11px] md:text-sm heading-brutal uppercase text-black">
              {project.title}
            </h3>
            <p className="text-[9px] md:text-xs label-brutal text-black/50 mt-2">
              {project.members.length} MEMBERS
            </p>
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
