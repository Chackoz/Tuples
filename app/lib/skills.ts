export const skills = [
  // Core Institution Identity
  "MBCET",

  // Lifestyle & Personal Interests
  "Fitness & Wellness",
  "Digital Nomadism",
  "Sustainable Living",
  "Creative Hobbies",
  "Cultural Exploration",
  "Mindful Living",
  "Urban Exploration",
  "Personal Branding",

  // Creative & Artistic Domains
  "Digital Art",
  "Music Production",
  "Filmmaking",
  "Performance Arts",
  "Creative Writing",
  "Photography",
  "Graphic Design",
  "Sound Design",
  "Animation",
  "Illustration",

  // Technology & Innovation
  "AI",
  "AI/ML",
  "Web Development",
  "Mobile App Development",
  "Cloud Computing",
  "Artificial Intelligence",
  "Machine Learning",
  "Blockchain Technology",
  "Cybersecurity",
  "Internet of Things",
  "Data Science",
  "Virtual Reality",
  "Augmented Reality",
  "Quantum Computing",

  // Academic & Research Disciplines
  "Interdisciplinary Studies",
  "Climate Change Research",
  "Biotechnology",
  "Neuroscience",
  "Space Exploration",
  "Sustainable Development",
  "Urban Planning",
  "Computational Biology",
  "Digital Humanities",
  "Cognitive Psychology",

  // Professional & Soft Skills
  "Strategic Leadership",
  "Design Thinking",
  "Global Communication",
  "Emotional Intelligence",
  "Agile Methodologies",
  "Conflict Resolution",
  "Cross-Cultural Collaboration",
  "Innovation Management",
  "Systems Thinking",
  "Adaptive Learning",

  // Digital & Media Skills
  "Content Creation",
  "Digital Marketing",
  "Social Media Strategy",
  "SEO & Analytics",
  "Podcast Production",
  "Video Editing",
  "UI/UX Design",
  "Interactive Media",
  "Digital Storytelling",
  "Brand Communication",

  // Entrepreneurship & Innovation
  "Social Entrepreneurship",
  "Startup Ecosystem",
  "Product Management",
  "Innovation Consulting",
  "Sustainable Business Models",
  "Tech Entrepreneurship",
  "Impact Investing",
  "Design Entrepreneurship",

  // Wellness & Personal Development
  "Holistic Wellness",
  "Mental Health Advocacy",
  "Life Coaching",
  "Stress Management",
  "Nutritional Science",
  "Mindfulness Coaching",
  "Positive Psychology",
  "Resilience Training",

  // Social Impact & Community
  "Community Development",
  "Social Justice",
  "Environmental Advocacy",
  "Diversity & Inclusion",
  "Global Citizenship",
  "Humanitarian Technology",
  "Nonprofit Management",
  "Sustainability Solutions",

  // Emerging Technologies
  "Edge Computing",
  "Robotics Engineering",
  "Green Technology",
  "Bioinformatics",
  "Digital Transformation",
  "Ethical Tech Design",
  "Human-Computer Interaction",

  // Cultural & Creative Domains
  "World Cinema",
  "Cross-Cultural Arts",
  "Digital Music",
  "Immersive Storytelling",
  "Cultural Heritage Preservation",
  "Global Pop Culture",
  "Transmedia Storytelling",

  // Interdisciplinary Skills
  "Systems Design",
  "Complexity Management",
  "Interdisciplinary Research",
  "Future Forecasting",
  "Collaborative Innovation",

  // Lifestyle & Personal Interests
  "Fitness & Wellness",
  "Travel",
  "Cooking",
  "Photography",
  "Music",
  "Movies",
  "Reading",
  "Art",
  "Dancing",
  "Gaming",
  "Sports",
  "Outdoor Activities",
  "Technology",
  "Fashion",
  "Food & Dining",
  "Podcasts",
  "Blogging",

  // Pop Culture & Entertainment
  "Anime",
  "Manga",
  "K-Drama",
  "K-Pop",
  "Korean Pop Culture",
  "J-Pop",
  "Cosplay",
  "Comic Conventions",
  "Video Game Streaming",
  "Movie Critique",
  "TV Series Binge",

  // Arts & Creative Interests
  "Painting",
  "Drawing",
  "Sketching",
  "Digital Art",
  "Sculpture",
  "Pottery",
  "Graphic Design",
  "Street Photography",
  "Portrait Photography",
  "Landscape Photography",
  "Music Production",
  "Songwriting",
  "Instrument Playing",

  // Media & Entertainment
  "Film Making",
  "Video Editing",
  "Vlogging",
  "Podcasting",
  "Stand-Up Comedy",
  "Theater",
  "Musical Theater",
  "Content Creation",
  "Social Media Influencing",

  // Cultural Interests
  "Language Learning",
  "International Cuisine",
  "Cultural Exchange",
  "World Cinema",
  "Global Music",
  "Traditional Dance",
  "Historical Research",

  // Digital & Tech Hobbies
  "Game Development",
  "Coding",
  "3D Modeling",
  "Digital Illustration",
  "Streaming",
  "Meme Culture",
  "Tech Gadgets",

  // Sports & Physical Activities
  "Football",
  "Basketball",
  "Volleyball",
  "Cricket",
  "Running",
  "Yoga",
  "Hiking",
  "Swimming",
  "Cycling",
  "Fitness Training",
  "Martial Arts",

  // Intellectual Pursuits
  "Chess",
  "Puzzles",
  "Quiz Competitions",
  "Debate",
  "Public Speaking",
  "Writing",
  "Poetry",
  "Book Clubs",
  "Philosophy",

  // Unique Interests
  "Board Games",
  "Escape Rooms",
  "Urban Exploration",
  "Gardening",
  "DIY Crafts",
  "Sustainable Living",
  "Minimalism",
  "Vintage Collecting",
  "Thrifting"

];

export const getRandomSkills = (numSkills: number) => {
  const shuffledSkills = skills.sort(() => Math.random() - 0.5);
  return shuffledSkills.slice(0, numSkills);
};