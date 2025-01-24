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
  title: string;
  description: string;
  technologies: string[];
  skills: string[];
  owner: string;
  members: string[];
  status: 'planning' | 'in-progress' | 'completed';
  userIds:string[]
  idealTeamSize: number;
  createdAt: Date;
  isPrivate?: boolean;
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


export interface Post {
  id?: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  interests: string[];
  createdAt: any;
}