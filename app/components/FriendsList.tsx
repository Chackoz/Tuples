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
  state: boolean;
  setstate: (view: boolean) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({
  friends,
  myFriends,
  currentView,
  currentUserId,
  state,
  setstate
}) => {
  return (
    <>
      {currentView === "Friends" && myFriends.length > 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-4 ">
          {myFriends.map((friend, index) => (
            <FriendCard
              key={friend.id || index}
              friend={friend}
              currentUserId={currentUserId}
              onRequestSent={() => {
                /* Handle request sent */
              }}
              onRequestCancelled={() => {
                /* Handle request cancelled */
              }}
              showAddButton={true}
              isFriend={false}
              state={state}
              setstate={setstate}
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
              onRequestSent={() => {
                /* Handle request sent */
              }}
              onRequestCancelled={() => {
                /* Handle request cancelled */
              }}
              showAddButton={true}
              isFriend={false}
              state={state}
              setstate={setstate}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default FriendsList;
