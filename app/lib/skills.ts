export const skills = [
  "💻 Frontend Development",
  "🖥️ Backend Development",
  "🌐 Full Stack Development",
  "🎨 Web Design",
  "📱 Mobile App Development",
  "🎨 UI/UX Design",
  "💾 Database Management",
  "☁️ Cloud Computing",
  "🤖 Machine Learning",
  "📊 Data Analysis",
  "📢 Digital Marketing",
  "✍️ Content Writing",
  "🎨 Graphic Design",
  "🎥 Video Editing",
  "📸 Photography",
  "🎵 Music Production",
  "🎨 Illustration",
  "🎞️ Animation",
  "🎮 Game Development",
  "🔒 Cybersecurity"
];

export const getRandomSkills = (numSkills: number) => {
  const shuffledSkills = skills.sort(() => Math.random() - 0.5);
  return shuffledSkills.slice(0, numSkills);
};
