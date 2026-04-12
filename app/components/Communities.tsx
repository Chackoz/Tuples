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
      className="card-brutal flex flex-col bg-white"
    >
      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-4 gap-4">
          <h2 className="heading-brutal text-xl uppercase break-words">{community.name}</h2>
          {isJoined ? (
            <span className="tag-brutal bg-green-400 text-black shadow-[2px_2px_0px_#000] shrink-0">JOINED</span>
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
              className="btn-primary py-2 px-6 shrink-0"
            >
              JOIN
            </button>
          )}
        </div>
        <p className="subheading-brutal text-black/70 mb-2 truncate">CREATOR: {community.creator?.toUpperCase()}</p>
        <p className="label-brutal text-black/50 mb-6">MEMBERS: {community.members.length}</p>
        <div className="flex flex-wrap gap-2 mt-auto">
          {community.tags.map((tag, index) => (
            <span
              key={index}
              className="tag-brutal bg-pink-300 shadow-[2px_2px_0px_#000]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex border-b-4 border-black">
        <button
          onClick={() => setActiveTab('available')}
          className={`heading-brutal px-6 md:px-8 py-4 transition-colors ${activeTab === 'available' 
            ? 'bg-blue-500 text-white border-t-4 border-l-4 border-r-4 border-black' 
            : 'text-black/50 hover:text-black border-transparent border-t-4 border-l-4 border-r-4 hover:bg-black/5'}`}
        >
          AVAILABLE
        </button>
        <button
          onClick={() => setActiveTab('joined')}
          className={`heading-brutal px-6 md:px-8 py-4 transition-colors ${activeTab === 'joined' 
            ? 'bg-blue-500 text-white border-t-4 border-l-4 border-r-4 border-black' 
            : 'text-black/50 hover:text-black border-transparent border-t-4 border-l-4 border-r-4 hover:bg-black/5'}`}
        >
          MY COMMUNITIES
        </button>
      </div>

      {activeTab === 'available' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCommunities.length > 0 ? (
            availableCommunities.map(community => renderCommunityCard(community, false))
          ) : (
            <div className="card-brutal bg-[#f0f0f0] border-dashed col-span-full py-16 flex items-center justify-center">
              <p className="heading-brutal text-black/40 text-center">NO AVAILABLE COMMUNITIES</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'joined' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCommunities.length > 0 ? (
            myCommunities.map(community => renderCommunityCard(community, true))
          ) : (
            <div className="card-brutal bg-[#f0f0f0] border-dashed col-span-full py-16 flex items-center justify-center">
              <p className="heading-brutal text-black/40 text-center">YOU HAVEN'T JOINED ANY COMMUNITIES YET</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Communities;