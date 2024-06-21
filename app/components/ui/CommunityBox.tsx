import React from 'react';

interface Community {
  id: string;
  name: string;
  creator: string;
  members: string[];
}

interface CommunityBoxProps {
  community?: Community;
}

function CommunityBox({ community }: CommunityBoxProps) {
  if (!community) {
    return (
      <div className='w-[5vw] h-[5vw] bg-[#eeeeee] rounded-lg flex items-center justify-center text-gray-400'>
        Empty
      </div>
    );
  }

  return (
    <div className='w-[5vw] h-[5vw] bg-[#eeeeee] rounded-lg flex flex-col items-center justify-center p-2 overflow-hidden'>
      <h3 className='text-[0.8vw] font-semibold text-center truncate w-full'>{community.name}</h3>
      <p className='text-[0.6vw] text-gray-500'>{community.members.length} members</p>
    </div>
  );
}

export default CommunityBox;