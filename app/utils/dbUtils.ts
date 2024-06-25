import { doc, getDoc, collection, getDocs, updateDoc, arrayRemove, arrayUnion, query, where, writeBatch } from "firebase/firestore";
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

// Cache for users and communities
const userCache = new Map<string, User>();
const communityCache = new Map<string, Community>();

export const getUserById = async (userId: string): Promise<User | null> => {
    if (userCache.has(userId)) {
        return userCache.get(userId)!;
    }

    try {
        const userRef = doc(db, "users", userId);
        const userSnapshot = await getDoc(userRef);
        if (userSnapshot.exists()) {
            const userData = userSnapshot.data() as User;
            userCache.set(userId, userData);
            return userData;
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
    if (communityCache.size > 0) {
        return Array.from(communityCache.values());
    }

    try {
        const communitiesRef = collection(db, "communities");
        const querySnapshot = await getDocs(communitiesRef);
        const communities = querySnapshot.docs.map(doc => {
            const community = { id: doc.id, ...doc.data() } as Community;
            communityCache.set(doc.id, community);
            return community;
        });
        return communities;
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
        const batch = writeBatch(db);

        // Update community
        const communityRef = doc(db, "communities", communityId);
        batch.update(communityRef, {
            members: arrayUnion(userName)
        });

        // Update chat
        const chatQuery = query(collection(db, "chats"), where("name", "==", communityName));
        const chatQuerySnapshot = await getDocs(chatQuery);
        const chatDoc = chatQuerySnapshot.docs[0];

        if (chatDoc) {
            const chatRef = doc(db, "chats", chatDoc.id);
            batch.update(chatRef, {
                participants: arrayUnion(userId),
            });
        } else {
            console.error("No chat document found for community", communityId);
        }

        // Commit batch
        await batch.commit();

        alert(`User ${userId} joined community ${communityName} successfully!`);
        
        setAllCommunities(prevCommunities =>
            prevCommunities.map(community =>
                community.id === communityId
                    ? { ...community, members: [...community.members, userName] }
                    : community
            )
        );

        // Update cache
        const cachedCommunity = communityCache.get(communityId);
        if (cachedCommunity) {
            cachedCommunity.members.push(userName);
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
                const updatedUser = {
                    ...prevUser,
                    friends: prevUser.friends.filter(friend => friend !== friendName)
                };
                userCache.set(currentUserId, updatedUser);
                return updatedUser;
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

