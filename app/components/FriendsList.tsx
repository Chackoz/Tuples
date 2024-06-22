import React from "react";
import FriendCard from "./ui/FriendCard";

interface User {
  name: string;
  interests: string[];
  friends: string[];
}

interface Friend {
  id?: string;
  name: string;
  interests: string[];
}

interface Community {
  id: string;
  name: string;
  creator: string;
  members: string[];
  tags: string[];
}

interface FriendsListProps {
  friends: Friend[];
  myFriends: Friend[];
  currentView: string;
  currentUserId: string;
  handleAddFriend: () => void;
  handleRemoveFriend: (friendName: string) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({
  friends,
  myFriends,
  currentView,
  currentUserId,
  handleAddFriend,
  handleRemoveFriend
}) => {
  return (
    <>
      {currentView === "Friends" && myFriends.length > 1 && (
        <div className="flex w-full flex-col items-center justify-center gap-4 ">
          {myFriends.map((friend, index) => (
            <FriendCard
              key={friend.id || index}
              friend={friend}
              currentUserId={currentUserId}
              onAddFriend={handleAddFriend}
              onRemoveFriend={() => handleRemoveFriend(friend.name)}
              showAddButton={false}
            />
          ))}
        </div>
      )}
      {currentView !== "Friends" && (
        <div className="flex w-full flex-col items-center justify-center gap-4 ">
          {friends.map((friend, index) => (
            <FriendCard
              key={friend.id || index}
              friend={friend}
              currentUserId={currentUserId}
              onAddFriend={handleAddFriend}
              onRemoveFriend={() => handleRemoveFriend(friend.name)}
              showAddButton={true}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default FriendsList;
