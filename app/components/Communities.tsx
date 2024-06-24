import React from 'react';
import { handleJoinCommunity } from '../utils/dbUtils';
import { User } from '../types';


  
  interface Community {
    id: string;
    name: string;
    creator: string;
    members: string[];
    tags: string[];
    privateCommunity?:boolean;
  }
  

interface CommunitiesProps {
  allCommunities: Community[];
  user: User;
  setAllCommunities: React.Dispatch<React.SetStateAction<Community[]>>;
  setstate: React.Dispatch<React.SetStateAction<boolean>>;
  state: boolean;
  currentUserId:string;
 
}

const Communities: React.FC<CommunitiesProps> = ({ allCommunities, user, setAllCommunities, setstate, state ,currentUserId}) => {
  return (
    <div className="flex flex-col gap-4">
      {allCommunities
        .filter(community => !community.members.includes(user?.name || ""))
        .map(community => (
          <div key={community.id} className="flex items-center justify-between rounded border p-4">
            <div>
              <h2 className="text-lg font-semibold">{community.name}</h2>
              <p className="text-sm text-gray-600">Creator: {community.creator}</p>
              <p className="text-sm text-gray-600">Members: {community.members.length}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {community.tags.map((tag, index) => (
                  <span key={index} className="rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => handleJoinCommunity(community.id,community.name, user.name,currentUserId, setAllCommunities, setstate, state)}
              className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
            >
              Join
            </button>
          </div>
        ))}
    </div>
  );
};

export default Communities;
