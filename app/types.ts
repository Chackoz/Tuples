interface User {
  name: string;
  interests: string[];
  friends: string[];
  userId: string;
  id: string;
  currentUserId: string;
}

interface Friend {
  id?: string;
  name: string;
  interests: string[];
  userId?: string;
}

interface Community {
  id: string;
  name: string;
  creator: string;
  members: string[];
  tags: string[];
  privateCommunity?: boolean;
}

interface Insight {
  title: string;
  description: string;
  challenge: string;
}

interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: string;
  name: string;
  toname: string;
}