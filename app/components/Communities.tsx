import React, { useState } from "react";
import { handleJoinCommunity } from "../utils/dbUtils";
import { User } from "../types";

interface Community {
  id: string;
  name: string;
  creator: string;
  members: string[];
  tags: string[];
  privateCommunity?: boolean;
}

interface CommunitiesProps {
  allCommunities: Community[];
  user: User;
  setAllCommunities: React.Dispatch<React.SetStateAction<Community[]>>;
  setstate: React.Dispatch<React.SetStateAction<boolean>>;
  state: boolean;
  currentUserId: string;
}

const Communities: React.FC<CommunitiesProps> = ({
  allCommunities,
  user,
  setAllCommunities,
  setstate,
  state,
  currentUserId
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'joined'>('available');

  // Communities the user has joined
  const myCommunities = allCommunities.filter((community) => 
    community.members.includes(user?.name || "")
  );

  // Communities the user can join
  const availableCommunities = allCommunities.filter((community) => 
    !community.members.includes(user?.name || "")
  );

  const renderCommunityCard = (community: Community, isJoined: boolean) => (
    <div
      key={community.id}
      className="flex flex-col rounded-lg border bg-white shadow-md transition-shadow hover:shadow-lg"
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-gray-800">{community.name}</h2>
          {isJoined ? (
            <span className="text-green-600 font-semibold text-sm">Joined</span>
          ) : (
            <button
              onClick={() =>
                handleJoinCommunity(
                  community.id,
                  community.name,
                  user.name,
                  currentUserId,
                  setAllCommunities,
                  setstate,
                  state
                )
              }
              className="rounded bg-blue-500 px-3 py-1 text-sm font-bold text-white hover:bg-blue-600"
            >
              Join
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-2">Creator: {community.creator}</p>
        <p className="text-sm text-gray-500 mb-2">Members: {community.members.length}</p>
        <div className="flex flex-wrap gap-2">
          {community.tags.map((tag, index) => (
            <span
              key={index}
              className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex mb-6 border-b">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 ${activeTab === 'available' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500'}`}
        >
          Available Communities
        </button>
        <button
          onClick={() => setActiveTab('joined')}
          className={`px-4 py-2 ${activeTab === 'joined' 
            ? 'border-b-2 border-blue-500 text-blue-600' 
            : 'text-gray-500'}`}
        >
          My Communities
        </button>
      </div>

      {activeTab === 'available' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableCommunities.length > 0 ? (
            availableCommunities.map(community => renderCommunityCard(community, false))
          ) : (
            <p className="text-gray-500 col-span-full text-center">
              No available communities to join
            </p>
          )}
        </div>
      )}

      {activeTab === 'joined' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myCommunities.length > 0 ? (
            myCommunities.map(community => renderCommunityCard(community, true))
          ) : (
            <p className="text-gray-500 col-span-full text-center">
              You haven&apos;t joined any communities yet
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Communities;