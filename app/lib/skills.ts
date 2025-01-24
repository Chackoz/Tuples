export const skills = [

  "MBCET",
  // Lifestyle Interests
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

  // Weeby Interests
  "Anime",
  "Manga",
  "K-Drama",
  "K-Pop",
  "Drama",
  "Books",
  "Writing",

  // Academic Disciplines
  "Arts & Humanities",
  "Social Sciences",
  "Natural Sciences",
  "Engineering",
  "Computer Science",
  "Business & Management",
  "Health Sciences",
  "Environmental Studies",
  "Communication Studies",
  "Education",
  "International Relations",

  // Professional Skills
  "Data Analysis",
  "Research Methods",
  "Project Management",
  "Public Speaking",
  "Technical Writing",
  "Digital Marketing",
  "Content Creation",
  "Graphic Design",
  "UI/UX Design",
  "Web Development",
  "Mobile App Development",
  "Cybersecurity",
  "Cloud Computing",
  "Machine Learning",
  "Artificial Intelligence",
  "Data Visualization",
  "Digital Photography",
  "Video Production",
  "Podcasting",
  "Translation Services",

  // Technical Skills
  "Programming Languages",
  "Database Management",
  "Network Administration",
  "Software Testing",
  "Version Control",
  "Blockchain Technology",
  "Internet of Things (IoT)",
  "Robotics",
  "3D Printing",
  "CAD Design",
  "Web Design",
  "Game Development",
  "Virtual Reality (VR)",
  "Augmented Reality (AR)",
  "Cybersecurity",
  "Cloud Computing",
  "Web Development",
  "Front-End Development", 



  // Creative Skills
  "Creative Writing",
  "Music Composition",
  "Digital Art",
  "Animation",
  "Film Making",
  "Theater Arts",
  "Photography",
  "Illustration",
  "Sound Design",
  "Performance Arts",

  // Research & Academic Interests
  "Scientific Research",
  "Academic Writing",
  "Literature Review",
  "Statistical Analysis",
  "Experimental Design",
  "Literature Criticism",
  "Qualitative Research",
  "Quantitative Analysis",

  // Soft Skills
  "Leadership",
  "Team Collaboration",
  "Conflict Resolution",
  "Cross-Cultural Communication",
  "Critical Thinking",
  "Problem Solving",
  "Emotional Intelligence",
  "Adaptive Learning",
  "Time Management",
  "Networking",

  // Personal Development
  "Mental Health Awareness",
  "Stress Management",
  "Financial Literacy",
  "Personal Branding",
  "Career Planning",
  "Professional Networking",
  "Language Learning",
  "Cultural Exchange",

  // Community & Social Engagement
  "Social Entrepreneurship",
  "Non-Profit Management",
  "Community Organizing",
  "Sustainability Initiatives",
  "Environmental Advocacy",
  "Social Justice",
  "Diversity & Inclusion",
  "Volunteer Management",

  // Wellness & Lifestyle
  "Fitness & Nutrition",
  "Mental Wellness",
  "Mindfulness",
  "Yoga",
  "Meditation",
  "Outdoor Recreation",
  "Sports Management",
  "Health & Wellness Coaching",

  // Hobbies & Interests
  "Gaming",
  "Board Games",
  "Chess",
  "E-Sports",
  "Cooking",
  "Gardening",
  "DIY Projects",
  "Travel Planning",
  "Photography",
  "Blogging"
];

export const getRandomSkills = (numSkills: number) => {
  const shuffledSkills = skills.sort(() => Math.random() - 0.5);
  return shuffledSkills.slice(0, numSkills);
};
