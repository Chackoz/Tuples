import React, { useState } from "react";

interface Community {
  id: string;
  name: string;
  creator: string;
  members: string[];
}

interface CommunityBoxProps {
  community?: Community;
}

function Modal({
  show,
  onClose,
  community
}: {
  show: boolean;
  onClose: () => void;
  community: Community;
}) {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
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
          <ul className="ml-5 list-disc max-h-[150px] custom-scrollbar overflow-y-auto">
            {community.members.map((member, index) => (
              <li key={index}>{index+1} {member}</li>
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
    </div>
  );
}

function CommunityBox({ community }: CommunityBoxProps) {
  const [isModalOpen, setModalOpen] = useState(false);

  const handleBoxClick = () => {
    if (community) {
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
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            Empty
          </div>
        )}
      </div>

      {community && (
        <Modal
          show={isModalOpen}
          onClose={() => setModalOpen(false)}
          community={community}
        />
      )}
    </>
  );
}

export default CommunityBox;
