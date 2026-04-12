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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-[500px] card-brutal bg-white p-6 relative">
        <h2 className="heading-brutal mb-6 text-2xl">CREATE A POST</h2>
        <input
          type="text"
          placeholder="POST TITLE"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-brutal mb-4 w-full"
        />
        <textarea
          placeholder="POST CONTENT"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input-brutal mb-6 h-[200px] w-full resize-none"
        />
        <div className="mb-6">
          <h3 className="subheading-brutal mb-3">SELECT INTERESTS</h3>
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
                className={`tag-brutal cursor-pointer transition-transform hover:-translate-y-1 ${
                  selectedInterests.includes(interest)
                    ? "bg-blue-500 text-white shadow-[2px_2px_0px_#000]"
                    : "bg-white text-black hover:shadow-[2px_2px_0px_#3b82f6]"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onClose} className="btn-secondary px-8 py-3">
            CANCEL
          </button>
          <button
            onClick={handleCreatePost}
            className="btn-primary px-8 py-3"
          >
            CREATE POST
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
      where("interests", "array-contains-any", userInterests),
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
      if (cachedAIPosts.length > 4) {
        console.log("Using cached AI posts.");
        return cachedAIPosts;
      }
    
      // If no cached posts, generate new ones
      const canGenerate = await checkGenerationLimit();
      if (!canGenerate) {
        console.log("Generation limit reached for today.");
        return [];
      }
      console.log("Generating new AI posts.");

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
        <div className="h-12 w-12 border-4 border-black border-t-blue-500 animate-spin shadow-[4px_4px_0px_#000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div
          key={post.id}
          className={`card-brutal bg-white p-6 ${
            post.userId === "ai-generated" ? "border-4 border-blue-500 shadow-[6px_6px_0px_#000]" : ""
          }`}
        >
          <h3 className="heading-brutal text-2xl mb-3">{post.title?.toUpperCase()}</h3>
          <div className="w-full flex justify-between items-center mb-6 border-b-2 border-black pb-4">
            <p className="subheading-brutal text-black/70 flex items-center">
              BY {post.userName?.toUpperCase() || "UNKNOWN"}
              {post.userId === "ai-generated" && (
                <span className="ml-3 tag-brutal bg-blue-500 text-white text-[10px] py-0.5 px-2">AI GENERATED</span>
              )}
            </p>
            <div className="label-brutal text-black/50">
              {post.createdAt?.toDate ? `POSTED ON ${post.createdAt.toDate().toLocaleDateString()}` : 'JUST NOW'}
            </div>
          </div>
          <p className="text-black font-medium leading-relaxed mb-6">{post.content}</p>
          <div className="flex flex-wrap gap-2">
            {post.interests.map((interest) => (
              <span
                key={interest}
                className="tag-brutal bg-yellow-300"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      ))}
      {posts.length === 0 && (
        <div className="py-16 card-brutal flex flex-col items-center justify-center bg-[#f0f0f0] border-dashed border-4 border-black mt-8">
          <p className="heading-brutal text-black/40 text-center px-4">NO POSTS FOUND. TRY EXPLORING DIFFERENT INTERESTS!</p>
        </div>
      )}
    </div>
  );
}

export { PostsList };

export { PostCreationModal };
