"use client";
import React from 'react';
import Image from 'next/image';
import { 
  GithubIcon, 
  LinkedinIcon, 
  TwitterIcon, 
  CodeIcon, 
  StarIcon, 
  UsersIcon 
} from 'lucide-react';
import { jakartasmall } from '@/app/utils/fonts';
import NavBar from '@/app/components/NavBar';

const creators = [
  {
    name: "Adithya Krishnan",
    avatar: "https://avatars.githubusercontent.com/u/79042374?v=4",
    github: "https://github.com/fal3n-4ngel",
    role: "Developer",
  
  },
  {
    name: "Ferwin Lopez",
    avatar: "https://avatars.githubusercontent.com/u/102341775?v=4",
    github: "https://github.com/Fer-Win",
    role: "Developer",
  
  },
  {
    name: "Nevia Sebastian",
    avatar: "https://avatars.githubusercontent.com/u/101114152?v=4",
    github: "https://github.com/neviaseb03",
    role: "Developer",
   
  },
  {
    name: "Nikita Nair",
    avatar: "https://avatars.githubusercontent.com/u/114907090?v=4",
    github: "https://github.com/Nk0x1",
    role: "Developer",
    
  }
];

const CreatorsPage: React.FC = () => {
  return (
    <div className={`${jakartasmall.className} min-h-screen bg-gray-50  flex flex-col justify-between items-center`}>
      <NavBar />
      <div className="container mx-auto max-w-6xl">
        {/* Project Overview */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">Tuples: Connecting Baselians</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A collaborative platform designed to bridge knowledge gaps, foster project collaborations, 
            and create meaningful connections among engineering students.
          </p>
        </div>
       {/* GitHub Link */}
       <div className="flex justify-center mb-8">
          <a 
            href='https://github.com/Chackoz/Tuples' 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <GithubIcon size={20} />
            <span>View Project on GitHub</span>
          </a>
        </div>

        {/* Creators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {creators.map((creator, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl shadow-lg p-6 text-center transform transition-all hover:-translate-y-2 hover:shadow-xl"
            >
              <Image 
                src={creator.avatar} 
                alt={creator.name} 
                width={150} 
                height={150} 
                className="rounded-full mx-auto mb-4 border-4 border-blue-100"
              />
              <h2 className="text-xl font-semibold text-gray-800">{creator.name}</h2>
              <p className="text-blue-600 mb-2">{creator.role}</p>
              
              <div className="flex justify-center space-x-3 my-4">
                <a 
                  href={creator.github} 
                  target="_blank" 
                  className="text-gray-600 hover:text-black"
                >
                  <GithubIcon size={24} />
                </a>
              </div>
              
              
            </div>
          ))}
        </div>

        {/* Project Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <StarIcon size={40} className="mx-auto text-yellow-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-800">13</h3>
            <p className="text-gray-600">Total Repositories</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <UsersIcon size={40} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-800">4</h3>
            <p className="text-gray-600">Team Members</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <CodeIcon size={40} className="mx-auto text-purple-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-800">7+</h3>
            <p className="text-gray-600">Technologies Used</p>
          </div>
        </div>
      </div>
      <div></div>
    </div>
  );
};

export default CreatorsPage;