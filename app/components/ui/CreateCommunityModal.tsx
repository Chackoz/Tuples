import React, { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  query,
  where,
  limit
} from "firebase/firestore";
import { db } from "@/app/lib/firebaseConfig";
import { User } from "@/app/types";

interface CreateJoinCommunityModalProps {
  onClose: () => void;
  onCreateOrJoin: () => void;
  user: User;
  state: boolean;
  setstate: (view: boolean) => void;
  currentUserId: string;
  privateCommunity: boolean;
}

function CreateJoinCommunityModal({
  onClose,
  onCreateOrJoin,
  user,
  state,
  setstate,
  currentUserId,
  privateCommunity
}: CreateJoinCommunityModalProps) {
  const [communityName, setCommunityName] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [priv, setpriv] = useState(privateCommunity || false);

  const handleCreateOrJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityName.trim()) return;

    try {
      if (mode === "create") {
        await addDoc(collection(db, "communities"), {
          name: communityName.trim(),
          creator: user?.name,
          members: [user.name],
          tags: tags,
         
          privateCommunity: priv
        });

        await addDoc(collection(db, "chats"), {
          createdAt: new Date(),
          type: "community",
          participants: [currentUserId],
          admins: [currentUserId],
          creator: user.name,
          name: communityName.trim(),
          unreadCounts:{},
          lastMessage:{content:"",timestamp:new Date(),senderId:""}
        });
      } else {
        const identifier = communityName.trim();
        const directCommunityRef = doc(db, "communities", identifier);
        const directCommunitySnapshot = await getDoc(directCommunityRef);

        let communityDocRef = directCommunityRef;
        let resolvedCommunityName = identifier;

        if (directCommunitySnapshot.exists()) {
          resolvedCommunityName = String(directCommunitySnapshot.data()?.name || identifier);
        } else {
          const communitiesRef = collection(db, "communities");
          const communityQuery = query(
            communitiesRef,
            where("name", "==", identifier),
            limit(1)
          );
          const communitySnapshot = await getDocs(communityQuery);

          if (communitySnapshot.empty) {
            alert("Community not found. Enter a valid Community ID or exact name.");
            return;
          }

          communityDocRef = communitySnapshot.docs[0].ref;
          resolvedCommunityName = String(communitySnapshot.docs[0].data()?.name || identifier);
        }

        await updateDoc(communityDocRef, {
          members: arrayUnion(user.name)
        });

        const chatRef = collection(db, "chats");
        const chatQuery = query(
          chatRef,
          where("name", "==", resolvedCommunityName),
          where("type", "==", "community"),
          limit(1)
        );
        const chatSnapshot = await getDocs(chatQuery);

        if (!chatSnapshot.empty) {
          await updateDoc(chatSnapshot.docs[0].ref, {
            participants: arrayUnion(currentUserId)
          });
        } else {
          alert("Joined community, but linked community chat was not found.");
        }
      }
      onCreateOrJoin();
      onClose();
      setstate(!state);
    } catch (error) {
      console.error("Error creating/joining community:", error);
    
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50 backdrop-blur-sm">
      <div className="w-full max-w-md card-brutal bg-white p-8">
        <h2 className="heading-brutal mb-6 text-2xl uppercase">{mode === "create" ? "CREATE" : "JOIN"} COMMUNITY</h2>
        <form onSubmit={handleCreateOrJoin}>
          <div className="mb-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`py-2 px-3 border font-bold text-sm ${
                mode === "create" ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              CREATE NEW
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`py-2 px-3 border font-bold text-sm ${
                mode === "join" ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              JOIN EXISTING
            </button>
          </div>

          <input
            type="text"
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder={mode === "create" ? "NEW COMMUNITY NAME" : "COMMUNITY ID OR NAME TO JOIN"}
            className="input-brutal mb-6 w-full"
          />
          {mode === "create" && (
            <div className="mb-6">
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder="ADD A TAG"
                  className="input-brutal flex-grow"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="btn-primary px-6 shrink-0"
                >
                  ADD
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="tag-brutal bg-cyan-100 text-cyan-800 shadow-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="font-bold hover:text-gray-900/50 text-base leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="mb-6 space-y-4">
            {mode === "create" && (
              <label className="flex items-center cursor-pointer group">
                <div className="relative flex items-center justify-center w-6 h-6 border border-gray-200 mr-3 shadow-sm group-hover:-translate-y-0.5 transition-transform bg-white shrink-0">
                  <input
                    type="checkbox"
                    checked={priv}
                    onChange={() => setpriv(!priv)}
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                  />
                  {priv && <div className="w-3 h-3 bg-gray-800"></div>}
                </div>
                <span className="subheading-brutal mt-1">PRIVATE COMMUNITY</span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-8 py-3"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="btn-primary px-8 py-3"
            >
              {mode === "create" ? "CREATE" : "JOIN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateJoinCommunityModal;
