import { useState, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  arrayUnion 
} from 'firebase/firestore';

import { Project, User } from '@/app/types';
import { db } from '@/app/lib/firebaseConfig';

export const useProject = () => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);

  const fetchAllProjects = useCallback(async () => {
    try {
      const projectsRef = collection(db, "projects");
      const q = query(projectsRef);
      const querySnapshot = await getDocs(q);

      const projectsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];

      setAllProjects(projectsData);
      return projectsData;
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  }, []);

  const fetchUserProjects = useCallback(async (userId: string) => {
    try {
      const projectsRef = collection(db, "projects");
      const q = query(projectsRef, where("userIDs", "array-contains", userId));
      const querySnapshot = await getDocs(q);

      const userProjectsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];

      setUserProjects(userProjectsData);
      return userProjectsData;
    } catch (error) {
      console.error("Error fetching user projects:", error);
      return [];
    }
  }, []);

  const joinProject = useCallback(async (
    projectId: string, 
    user: User, 
    onSuccess?: () => void
  ) => {
    if (!user) {
      console.error("User is required to join a project");
      return false;
    }

    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        members: arrayUnion(user.name),
        userIds:arrayUnion(user.userId)
      });

      // Update local state
      setAllProjects(prevProjects => 
        prevProjects.map(project => 
          project.id === projectId
            ? { ...project, members: [...project.members, user.name] }
            : project
        )
      );

      // Optionally refetch user projects
      await fetchUserProjects(user.userId);

      onSuccess?.();
      return true;
    } catch (error) {
      console.error("Error joining project:", error);
      return false;
    }
  }, [fetchUserProjects]);

  return {
    allProjects,
    userProjects,
    fetchAllProjects,
    fetchUserProjects,
    joinProject
  };
};