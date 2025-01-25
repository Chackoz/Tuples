"use client"
import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import { User, Post } from '@/app/types';
import { useToast } from '@/hooks/use-toast';
import { jakartasmall } from "@/app/utils/fonts";
import NavBar from "@/app/components/NavBar";
import FriendCard from "@/app/components/ui/FriendCard";
import { Spinner } from '@/app/components/ui/Spinner';


const ProfileContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutualFriends, setMutualFriends] = useState<User[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);

  useEffect(() => {
    const userId = searchParams.get('id');
    const currentUserId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("userId"))
      ?.split("=")?.[1];

    if (userId && currentUserId) {
      fetchUserProfile(userId);
      fetchCurrentUser(currentUserId);
    } else {
      toast({
        title: "Error",
        description: "User ID missing",
        variant: "destructive"
      });
      router.push('/');
    }
  }, [searchParams]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data() as User;
        setProfileUser(userData);
        await fetchMutualFriends(userData);
        await fetchUserPosts(userId);
      } else {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive"
        });
        router.push('/');
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive"
      });
      setLoading(false);
      router.push('/');
    }
  };

  const fetchCurrentUser = async (userId: string) => {
    const userRef = doc(db, "users", userId);
    const userSnapshot = await getDoc(userRef);
    if (userSnapshot.exists()) {
      setCurrentUser(userSnapshot.data() as User);
    }
  };

  const fetchMutualFriends = async (profileUser: User) => {
    if (!currentUser) return;
    const currentUserFriends = currentUser.friends || [];
    const profileUserFriends = profileUser.friends || [];
    const mutualFriendNames = currentUserFriends.filter(
      name => profileUserFriends.includes(name) && name !== profileUser.name
    );

    if (mutualFriendNames.length > 0) {
      const friendsQuery = query(
        collection(db, "users"),
        where("name", "in", mutualFriendNames)
      );
      const friendsSnapshot = await getDocs(friendsQuery);
      const friends = friendsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      setMutualFriends(friends);
    }
  };

  const fetchUserPosts = async (userId: string) => {
    try {
      const postsQuery = query(
        collection(db, "posts"),
        where("userId", "==", userId)
      );
      const postsSnapshot = await getDocs(postsQuery);
      const posts = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));
      setUserPosts(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-[#ebebeb] ${jakartasmall.className}`}>
        <NavBar />
        <div className="flex justify-center items-center h-screen">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!profileUser) return null;

  return (
    <div className={`min-h-screen w-full bg-[#ebebeb] ${jakartasmall.className}`}>
      <NavBar />
      <div className="flex w-full justify-center p-10">
        <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-md">
          {/* Profile Header */}
          <div className="flex items-center mb-6">
            {profileUser.profilePicUrl ? (
              <Image 
                src={profileUser.profilePicUrl} 
                alt={`${profileUser.name}'s profile`} 
                width={100} 
                height={100} 
                className="rounded-full object-cover w-24 h-24 mr-6" 
              />
            ) : (
              <div className="w-24 h-24 bg-blue-200 rounded-full flex items-center justify-center text-3xl font-bold mr-6">
                {profileUser.name[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{profileUser.name}</h1>
              <p className="text-gray-600">{profileUser.userId}</p>
            </div>
          </div>
          {/* Profile Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Interests</h2>
              {profileUser.interests && profileUser.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profileUser.interests.map((interest, index) => (
                    <span 
                      key={index} 
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No interests added</p>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">Friends</h2>
              {profileUser.friends && profileUser.friends.length > 0 ? (
                <p className="text-gray-600">{profileUser.friends.length - 1} friends connected</p>
              ) : (
                <p className="text-gray-500">No friends yet</p>
              )}
            </div>
          </div>
          {/* Mutual Friends */}
          {mutualFriends.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Mutual Friends</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mutualFriends.map(friend => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    currentUserId={currentUser?.id || ''}
                    showAddButton={false}
                    onRequestSent={() => {}}
                    onRequestCancelled={() => {}}
                    isFriend={true}
                    state={false}
                    setstate={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
          {/* User Posts */}
          {userPosts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Posts</h2>
              <div className="space-y-4">
                {userPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="bg-gray-100 p-4 rounded-lg"
                  >
                    <h1 className='text-xl font-semibold'>{post.title}</h1>
                    <p>{post.content}</p>
                   
                    <div className="text-sm text-gray-500 mt-2">
                      Posted on {new Date(post.createdAt?.toDate()).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UserProfilePage: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
};

export default UserProfilePage;