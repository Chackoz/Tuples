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
      <div className="relative flex min-h-screen flex-col bg-gray-50">
        
        <div className="z-10 w-full p-4 md:p-8 max-w-7xl mx-auto">
          <NavBar />
        </div>
        <div className="flex justify-center items-center flex-grow z-10">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!profileUser) return null;

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-gray-50">
      
      
      <div className="z-10 w-full max-w-4xl mx-auto p-4 md:p-8">
        <NavBar />
      
        <div className="mt-8 card-brutal relative">
          {/* Corner accents */}
          <div className="hero-corner-tl" />
          <div className="hero-corner-tr" />
          <div className="hero-corner-bl" />
          <div className="hero-corner-br" />

          {/* Profile Header */}
          <div className="flex items-center mb-8 border-b border-gray-200 pb-6">
            {profileUser.profilePicUrl ? (
              <Image 
                src={profileUser.profilePicUrl} 
                alt={`${profileUser.name}'s profile`} 
                width={100} 
                height={100} 
                className="object-cover w-24 h-24 mr-6 border border-gray-200 shadow-sm" 
              />
            ) : (
              <div className="w-24 h-24 bg-[#000] text-white flex items-center justify-center text-3xl font-black mr-6 border border-gray-200 shadow-sm">
                {profileUser.name[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="heading-brutal text-4xl">{profileUser.name}</h1>
              <p className="label-brutal text-gray-900/50 mt-1">{profileUser.userId}</p>
            </div>
          </div>
          {/* Profile Details */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="card-brutal bg-white p-6 shadow-none hover:shadow-sm transition-shadow">
              <h2 className="heading-brutal text-xl mb-6 flex items-center gap-2">
                INTERESTS
              </h2>
              {profileUser.interests && profileUser.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profileUser.interests.map((interest, index) => (
                    <span 
                      key={index} 
                      className="tag-brutal bg-white hover:bg-blue-100 text-blue-800 hover:-translate-y-0.5 transition-all text-sm px-3 py-1.5"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="py-6 border border-dashed border-gray-200/20 flex justify-center items-center h-full">
                  <p className="heading-brutal text-gray-900/40">NO INTERESTS</p>
                </div>
              )}
            </div>
            
            <div className="card-brutal bg-white p-6 shadow-none hover:shadow-sm transition-shadow">
              <h2 className="heading-brutal text-xl mb-6 flex items-center gap-2">
                NETWORK
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-center p-4 border border-gray-200 bg-white shadow-sm flex-1">
                  <h3 className="heading-brutal text-4xl mb-1">
                    {profileUser.friends ? profileUser.friends.length - 1 : 0}
                  </h3>
                  <p className="label-brutal text-gray-900/60">CONNECTIONS</p>
                </div>
                <div className="text-center p-4 border border-gray-200 bg-white shadow-sm flex-1">
                  <h3 className="heading-brutal text-4xl mb-1">
                    {mutualFriends.length}
                  </h3>
                  <p className="label-brutal text-gray-900/60">MUTUAL FRIENDS</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mutual Friends */}
          {mutualFriends.length > 0 && (
            <div className="mb-8 pt-8 border-t border-gray-200">
              <h2 className="heading-brutal text-2xl mb-6 flex items-center gap-3">
                MUTUAL FRIENDS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="pt-8 border-t border-gray-200 mt-8">
              <h2 className="heading-brutal text-2xl mb-6 flex items-center gap-3">
                RECENT POSTS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="card-brutal p-6 bg-white hover:bg-gray-50 transition-colors flex flex-col hover:-translate-y-1 hover:shadow-sm"
                  >
                    <h1 className='heading-brutal text-xl uppercase mb-3 line-clamp-2'>{post.title}</h1>
                    <p className="font-medium text-gray-900/80 mb-6 flex-1 line-clamp-4">{post.content}</p>
                   
                    <div className="label-brutal text-gray-900/50 pt-4 border-t border-gray-200 uppercase mt-auto">
                      POSTED ON {new Date(post.createdAt?.toDate()).toLocaleDateString()}
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