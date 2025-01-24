"use client"
import React, { useState, useEffect } from 'react';
import { RiTrophyLine, RiTeamLine, RiProjectorLine, RiLineChartLine } from 'react-icons/ri';
import Image from "next/image";
import { jakartasmall } from '@/app/utils/fonts';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebaseConfig';
import NavBar from '@/app/components/NavBar';


const UserStats: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith("userId"))
        ?.split("=")?.[1];

      if (cookieValue) {
        // Fetch user details
        const userRef = doc(db, "users", cookieValue);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser(userData);

          // Fetch user's projects
          const projectsRef = collection(db, "projects");
          const projectsQuery = query(projectsRef, where("members", "array-contains", userData.name));
          const projectsSnapshot = await getDocs(projectsQuery);
          setProjects(projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

          // Fetch user's communities
          const communitiesRef = collection(db, "communities");
          const communitiesQuery = query(communitiesRef, where("members", "array-contains", userData.name));
          const communitiesSnapshot = await getDocs(communitiesQuery);
          setCommunities(communitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      }
    };

    fetchUserData();
  }, []);

  const statsCards = [
    {
      icon: <RiProjectorLine className="text-blue-500" />,
      title: "Total Projects",
      value: projects.length,
      color: "bg-blue-50"
    },
    {
      icon: <RiTeamLine className="text-green-500" />,
      title: "Communities",
      value: communities.length,
      color: "bg-green-50"
    },
    {
      icon: <RiTrophyLine className="text-purple-500" />,
      title: "Completed Projects",
      value: projects.filter(p => p.status === 'completed').length,
      color: "bg-purple-50"
    },
    {
      icon: <RiLineChartLine className="text-orange-500" />,
      title: "Skill Level",
      value: `Level ${user?.skillLevel || 1}`,
      color: "bg-orange-50"
    }
  ];

  if (!user) return <div>Loading...</div>;

  return (
    <div className={`${jakartasmall.className} relative w-screen px-4  lg:px-5 flex flex-col items-center justify-between min-h-screen min-w-screen`}>
      <NavBar/>
      {/* User Profile Header */}
      <div className="hidden lg:block">
        <div className="flex h-52 w-52 flex-col items-center justify-center gap-4 rounded-lg bg-gray-100 p-2">
          {user.profilePicUrl && (
            <Image
              src={user.profilePicUrl}
              alt="User profile"
              width={100}
              height={100}
              className="m-1 max-h-[80%] w-3/5 rounded-2xl object-cover"
            />
          )}
          <h1 className="text-xl">{user.name}</h1>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 py-6">
        {statsCards.map((card, index) => (
          <div 
            key={index} 
            className={`flex flex-col items-center justify-center rounded-lg p-4 shadow-md ${card.color}`}
          >
            <div className="mb-2 text-3xl">{card.icon}</div>
            <h2 className="text-sm text-gray-600">{card.title}</h2>
            <div className="text-xl font-bold text-blue-600">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Detailed Performance Section */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-4 text-lg font-semibold">Performance Insights</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Project Completion Rate</span>
            <span className="font-bold text-green-600">
              {projects.length > 0 
                ? ((projects.filter(p => p.status === 'completed').length / projects.length) * 100).toFixed(1)
                : '0'}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Community Engagement</span>
            <span className="font-bold text-blue-600">{communities.length} Active</span>
          </div>
          <div className="flex justify-between">
            <span>Skill Progression</span>
            <span className="font-bold text-purple-600">+{user.skillLevel || 1} Levels</span>
          </div>
        </div>
      </div>
      <div></div>
    </div>
  );
};

export default UserStats;