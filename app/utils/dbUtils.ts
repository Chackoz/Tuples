import { doc, getDoc, collection, getDocs, updateDoc, arrayRemove, arrayUnion, query, where } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";


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

  

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnapshot = await getDoc(userRef);
    if (userSnapshot.exists()) {
      return userSnapshot.data() as User;
    } else {
      console.error("Document does not exist!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

export const fetchAllCommunities = async (): Promise<Community[]> => {
  try {
    const communitiesRef = collection(db, "communities");
    const querySnapshot = await getDocs(communitiesRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Community[];
  } catch (error) {
    console.error("Error fetching communities:", error);
    return [];
  }
};

export const handleJoinCommunity = async (
  communityId: string,
  communityName: string,
  userName: string,
  userId: string,
  setAllCommunities: React.Dispatch<React.SetStateAction<Community[]>>,
  setstate: React.Dispatch<React.SetStateAction<boolean>>,
  state: boolean
) => {
  try {
    const communityRef = doc(db, "communities", communityId);
    await updateDoc(communityRef, {
      members: arrayUnion(userName)
    });
    alert( `User ${userId} joined community ${communityName} successfully!`);
    
    setAllCommunities(prevCommunities =>
      prevCommunities.map(community =>
        community.id === communityId
          ? { ...community, members: [...community.members, userName] }
          : community
      )
    );

    const chatQuery = query(collection(db, "chats"), where("name", "==", communityName));
    const chatQuerySnapshot = await getDocs(chatQuery);
    const chatDoc = chatQuerySnapshot.docs[0];

    if (chatDoc) {
      const chatRef = doc(db, "chats", chatDoc.id);
      await updateDoc(chatRef, {
        participants: arrayUnion(userId), 
      });
    } else {
      console.error("No chat document found for community", communityId);
    }


    setstate(!state);
  } catch (error) {
    console.error("Error joining community:", error);
    alert(`Failed to join community: ${(error as Error).message}`);
  }
};

export const handleRemoveFriend = async (
  friendName: string,
  currentUserId: string,
  setUser: React.Dispatch<React.SetStateAction<User | null>>,
  setMyFriends: React.Dispatch<React.SetStateAction<{ name: string, interests: string[] }[]>>
) => {
  try {
    const userRef = doc(db, "users", currentUserId);
    await updateDoc(userRef, {
      friends: arrayRemove(friendName)
    });

    setUser(prevUser => {
      if (prevUser) {
        return {
          ...prevUser,
          friends: prevUser.friends.filter(friend => friend !== friendName)
        };
      }
      return prevUser;
    });

    setMyFriends(prevFriends => prevFriends.filter(friend => friend.name !== friendName));

    console.log(`${friendName} removed from your friends list!`);
  } catch (error) {
    console.error("Error removing friend:", error);
    alert(`Failed to remove friend: ${(error as Error).message}`);
  }
};
