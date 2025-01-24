import { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

import { useRouter } from 'next/navigation';
import { auth, db } from '../lib/firebaseConfig';
import { user } from 'firebase-functions/v1/auth';

interface UseAuthReturn {
  name: string;
  email: string;
  userId: string;
  error: string;
  isValidEmail: boolean;
  verificationSent: boolean;
  isLoading: boolean;
  setEmail: (email: string) => void;
  validateEmail: () => boolean;
  signUp: (password: string, confirmPassword: string) => Promise<void>;
  login: (password: string) => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@mbcet.ac.in$/;
    const validEmail = emailRegex.test(email);

    if (validEmail) {
      const extractedName = email.split('@')[0].split('.')[0];
      const capitalizedExtractedName =
        extractedName.charAt(0).toUpperCase() + extractedName.slice(1);
      setName(capitalizedExtractedName);

      const userIdMatch = email.match(/\.(.*?)@/);
      if (userIdMatch) {
        setUserId(userIdMatch[1]);
      }

      setIsValidEmail(true);
      return true;
    } else {
      setIsValidEmail(false);
      setError('Use valid college email id.');
      return false;
    }
  };

  const addData = async (name: string, id: string) => {
    try {
      if(userId === '') return;
      const userRef = doc(db, 'users', id);
      await setDoc(userRef, {
        name,
        userId,
        Interests: [''],
        friends: [''],
        emailVerified: false,
      });
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  };

  const addCookie = (id: string) => {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    document.cookie = `userId=${id}; expires=${expires.toUTCString()}`;
  };

  const signUp = async (password: string, confirmPassword: string) => {
    setError('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords don't Match");
      setIsLoading(false);
      return;
    }

    if (!isValidEmail) {
      setError('Invalid email address');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);
      
      await addData(name, user.uid);
      addCookie(user.uid);

      setVerificationSent(true);
    } catch (error) {
      const firebaseError = error as FirebaseError;
      const errorMessage = firebaseError.message;
      const match = errorMessage.match(/\(([^)]+)\)/);

      setError(match ? match[1] : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (password: string) => {
    setError('');
    setIsLoading(true);
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Check email verification status
      if (!user.emailVerified) {
        setError('Please verify your email before logging in.');
        await auth.signOut(); // Sign out the user
        setIsLoading(false);
        return;
      }
  
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
  
        await updateEmailVerificationStatus(user.uid);
        addCookie(user.uid);
  
        userData.interests && userData.interests.length > 0
          ? router.push('/home')
          : router.push('/interests');
      } else {
        setError('User data not found. Please sign up first.');
      }
    } catch (error) {
      const firebaseError = error as FirebaseError;
      const match = firebaseError.message.match(/\(([^)]+)\)/);
      setError(match ? match[1] : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmailVerificationStatus = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { emailVerified: true });
    } catch (error) {
      console.error('Error updating email verification status:', error);
    }
  };

  return {
    name,
    email,
    userId,
    error,
    isValidEmail,
    verificationSent,
    isLoading,
    setEmail,
    validateEmail,
    signUp,
    login,
  };
};