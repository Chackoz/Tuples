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
    name: "ADITHYA KRISHNAN",
    avatar: "https://avatars.githubusercontent.com/u/79042374?v=4",
    github: "https://github.com/fal3n-4ngel",
    role: "DEVELOPER",
  
  },
  {
    name: "FERWIN LOPEZ",
    avatar: "https://avatars.githubusercontent.com/u/102341775?v=4",
    github: "https://github.com/Fer-Win",
    role: "DEVELOPER",
  
  },
  {
    name: "NEVIA SEBASTIAN",
    avatar: "https://avatars.githubusercontent.com/u/101114152?v=4",
    github: "https://github.com/neviaseb03",
    role: "DEVELOPER",
   
  },
  {
    name: "NIKITA NAIR",
    avatar: "https://avatars.githubusercontent.com/u/114907090?v=4",
    github: "https://github.com/Nk0x1",
    role: "DEVELOPER",
    
  }
];

const CreatorsPage: React.FC = () => {
  return (
    <div className={`relative flex min-h-screen flex-col items-center bg-[#f0f0f0]`}>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />
      <div className="z-10 w-full p-4 md:p-8 mx-auto">
        <NavBar />
        
        {/* Project Overview */}
        <div className="mb-12 mt-8 text-center card-brutal bg-white p-8 relative">
          <div className="hero-corner-tl" />
          <div className="hero-corner-tr" />
          <div className="hero-corner-bl" />
          <div className="hero-corner-br" />
          
          <h1 className="heading-brutal text-4xl md:text-5xl mb-6">TUPLES: CONNECTING BASELIANS</h1>
          <p className="text-black font-medium leading-relaxed max-w-3xl mx-auto text-lg">
            A COLLABORATIVE PLATFORM DESIGNED TO BRIDGE KNOWLEDGE GAPS, FOSTER PROJECT COLLABORATIONS, 
            AND CREATE MEANINGFUL CONNECTIONS AMONG ENGINEERING STUDENTS.
          </p>
          
          {/* GitHub Link */}
          <div className="flex justify-center mt-8">
            <a 
              href='https://github.com/Chackoz/Tuples' 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-primary flex items-center space-x-3 px-8 py-4 "
            >
              <GithubIcon size={24} />
              <span className="heading-brutal tracking-widest">VIEW PROJECT ON GITHUB</span>
            </a>
          </div>
        </div>

        {/* Creators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {creators.map((creator, index) => (
            <div 
              key={index} 
              className="card-brutal bg-white p-6 text-center transform transition-all hover:-translate-y-2 hover:shadow-[8px_8px_0px_#3b82f6]"
            >
              <Image 
                src={creator.avatar} 
                alt={creator.name} 
                width={120} 
                height={120} 
                className="rounded-none mx-auto mb-6 border-4 border-black shadow-[4px_4px_0px_#3b82f6]"
              />
              <h2 className="heading-brutal text-xl mb-2">{creator.name}</h2>
              <p className="subheading-brutal text-blue-600 mb-6">{creator.role}</p>
              
              <div className="flex justify-center space-x-3 mt-auto">
                <a 
                  href={creator.github} 
                  target="_blank" 
                  className="btn-secondary p-3 hover:bg-black hover:text-white"
                >
                  <GithubIcon size={24} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Project Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-12">
          <div className="card-brutal bg-white p-8 hover:bg-yellow-300 transition-colors group">
            <StarIcon size={48} className="mx-auto text-black mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="heading-brutal text-4xl mb-2">13</h3>
            <p className="subheading-brutal text-black/70">TOTAL REPOSITORIES</p>
          </div>
          <div className="card-brutal bg-white p-8 hover:bg-green-400 transition-colors group">
            <UsersIcon size={48} className="mx-auto text-black mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="heading-brutal text-4xl mb-2">4</h3>
            <p className="subheading-brutal text-black/70">TEAM MEMBERS</p>
          </div>
          <div className="card-brutal bg-white p-8 hover:bg-purple-400 transition-colors group">
            <CodeIcon size={48} className="mx-auto text-black mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="heading-brutal text-4xl mb-2">7+</h3>
            <p className="subheading-brutal text-black/70">TECHNOLOGIES USED</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorsPage;