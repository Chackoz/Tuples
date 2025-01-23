export interface User {
  name: string;
  interests: string[];
  friends: string[];
  userId: string;
  id: string;
  currentUserId: string;
  profilePicUrl?: string;
}


export interface Project {
  id: string;
  name?:string;
  title: string;
  description: string;
  owner: string;
  members: string[];
  technologies: string[];
  createdAt: Date;
  status: 'planning' | 'in-progress' | 'completed';
}


export interface Friend {
  id?: string;
  name: string;
  interests: string[];
  userId?: string;
  profilePicUrl?: string;
}

export interface Community {
  id: string;
  name: string;
  creator: string;
  members: string[];
  tags: string[];
  privateCommunity?: boolean;
}

export interface Insight {
  title: string;
  description: string;
  challenge: string;
}

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: string;
  name: string;
  toname: string;
}