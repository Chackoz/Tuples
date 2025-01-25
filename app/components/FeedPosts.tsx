import React, { useState, useCallback, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import { Post } from "../types";
import axios from "axios";

const CACHE_COLLECTION = "post_generation_cache";
const AI_POSTS_COLLECTION = "ai_generated_posts";
const MAX_DAILY_GENERATIONS = 3;

function PostCreationModal({
  isOpen,
  onClose,
  userId,
  userName,
  userInterests
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userInterests: string[];
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const handleCreatePost = async () => {
    try {
      await addDoc(collection(db, "posts"), {
        userId,
        userName,
        title,
        content,
        interests: selectedInterests,
        createdAt: serverTimestamp()
      });

      onClose();
      setTitle("");
      setContent("");
      setSelectedInterests([]);
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-[500px] rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">Create a Post</h2>
        <input
          type="text"
          placeholder="Post Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded border p-2"
        />
        <textarea
          placeholder="Post Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mb-4 h-[200px] w-full rounded border p-2"
        />
        <div className="mb-4">
          <h3 className="mb-2 font-semibold">Select Interests</h3>
          <div className="flex flex-wrap gap-2">
            {userInterests.map((interest) => (
              <button
                key={interest}
                onClick={() =>
                  setSelectedInterests((prev) =>
                    prev.includes(interest)
                      ? prev.filter((i) => i !== interest)
                      : [...prev, interest]
                  )
                }
                className={`rounded px-3 py-1 ${
                  selectedInterests.includes(interest)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="rounded bg-gray-200 px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleCreatePost}
            className="rounded bg-blue-500 px-4 py-2 text-white"
          >
            Create Post
          </button>
        </div>
      </div>
    </div>
  );
}

function PostsList({
  userId,
  userInterests
}: {
  userId: string;
  userInterests: string[];
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const checkGenerationLimit = async () => {
    const cacheDocRef = doc(db, CACHE_COLLECTION, "daily_generation");
    const cacheDoc = await getDoc(cacheDocRef);
    const today = new Date().toISOString().split("T")[0];

    if (cacheDoc.exists()) {
      const { date, count } = cacheDoc.data();
      if (date === today && count >= MAX_DAILY_GENERATIONS) {
        return false;
      }
    }
    return true;
  };

  const updateGenerationCache = async () => {
    const cacheDocRef = doc(db, CACHE_COLLECTION, "daily_generation");
    const today = new Date().toISOString().split("T")[0];

    const cacheDoc = await getDoc(cacheDocRef);
    if (cacheDoc.exists()) {
      const { date, count } = cacheDoc.data();
      await setDoc(cacheDocRef, {
        date: today,
        count: date === today ? count + 1 : 1
      });
    } else {
      await setDoc(cacheDocRef, {
        date: today,
        count: 1
      });
    }
  };

  const fetchCachedAIPosts = async () => {
    const aiPostsRef = collection(db, AI_POSTS_COLLECTION);
    const q = query(
      aiPostsRef,
      //where("interests", "array-contains-any", userInterests),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data()
        }) as Post
    );
  };

  const fetchGeminiGeneratedPosts = async (existingPosts: Post[]) => {
    try {
      // First, check cached AI posts
      const cachedAIPosts = await fetchCachedAIPosts();
      if (cachedAIPosts.length > 0) {
        return cachedAIPosts;
      }

      // If no cached posts, generate new ones
      const canGenerate = await checkGenerationLimit();
      if (!canGenerate) {
        return [];
      }

      const API_KEY = process.env.GEMINI_API_KEY;
      const API_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

      const prompt = `Generate ${5 - existingPosts.length} unique blog posts related to these interests: ${userInterests.join(", ")}. 
  
        For each post, provide:
        - A creative title related to engineering or technology 
        - A detailed content paragraph about the post
        - 2-3 relevant interests
  
        Format each post as:
        Title: [Post Title]
        Content: [Post Content]
        Interests: [Comma-separated interests]
  
        Separate posts with '---'`;

      const response = await axios.post(`${API_URL}?key=${API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
      });

      const generatedText = response.data.candidates[0].content.parts[0].text;
      const postEntries = generatedText
        .split("---")
        .filter((entry: string) => entry.trim());

      const geminiPosts: Post[] = postEntries.map((entry: string) => {
        const lines = entry.trim().split("\n");
        const post = {
          id: `ai-${Math.random().toString(36).substr(2, 9)}`,
          userId: "ai-generated",
          userName: "Tuples AI",
          title: lines[0].replace("Title: ", "").trim(),
          content: lines[1].replace("Content: ", "").trim(),
          interests: lines[2]
            .replace("Interests: ", "")
            .trim()
            .split(",")
            .map((i) => i.trim()),
          createdAt: new Date()
        };

        // Persist generated post to Firestore
        addDoc(collection(db, AI_POSTS_COLLECTION), post);
        return post;
      });

      // Update generation cache
      await updateGenerationCache();

      return geminiPosts;
    } catch (error) {
      console.error("Error generating Gemini posts:", error);
      return [];
    }
  };

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const postsRef = collection(db, "posts");
      const q = query(
        postsRef,
        where("interests", "array-contains-any", userInterests),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      const fetchedPosts = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data()
          }) as Post
      );

      if (fetchedPosts.length < 5) {
        const geminiPosts = await fetchGeminiGeneratedPosts(fetchedPosts);
        setPosts([...fetchedPosts, ...geminiPosts]);
      } else {
        setPosts(fetchedPosts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userInterests]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <div
          key={post.id}
          className={`mb-4 rounded-lg bg-white p-4 shadow ${
            post.userId === "ai-generated" ? "border-l-4 border-blue-300" : ""
          }`}
        >
          <h3 className="text-lg font-bold">{post.title}</h3>
         <div className="w-full flex justify-between items-center">
         <p className="mb-2 text-gray-600">
            By {post.userName}
            {post.userId === "ai-generated" && (
              <span className="ml-2 text-xs text-blue-500">(AI Generated)</span>
            )}
          </p>
          <div className="text-sm text-gray-500">
                    Posted on {post.createdAt?.toDate().toLocaleDateString()}
                  </div>
          </div>
          <p>{post.content}</p>
          <div className="mt-2 flex gap-2">
            {post.interests.map((interest) => (
              <span
                key={interest}
                className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      ))}
      {posts.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No posts found. Try exploring different interests!
        </div>
      )}
    </div>
  );
}

export { PostsList };

export { PostCreationModal };
