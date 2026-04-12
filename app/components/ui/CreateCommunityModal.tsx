import React, { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { db } from "@/app/lib/firebaseConfig";
import { User } from "@/app/types";
import { LiaSteam } from "react-icons/lia";
import { Timestamp } from "firebase-admin/firestore";

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
  const [isCreating, setIsCreating] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");

  const handleCreateOrJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityName.trim()) return;

    try {
      if (isCreating) {
        await addDoc(collection(db, "communities"), {
          name: communityName,
          creator: user?.name,
          members: [user.name],
          tags: tags,
         
          privateCommunity: priv
        });

        await addDoc(collection(db, "chats"), {
          createdAt: new Date(),
          type: "community",
          participants: [currentUserId],
          creator: user.name,
          name: communityName,
          unreadCounts:{},
          lastMessage:{content:"",timestamp:new Date(),senderId:""}
        });
      } else {
        const communitiesRef = collection(db, "communities");
        const communityDoc = await getDoc(doc(communitiesRef, communityName));

        if (communityDoc.exists()) {
          await updateDoc(doc(communitiesRef, communityName), {
            members: arrayUnion(user.name)
          });

          const chatRef = collection(db, "chats");
          const chatDoc = await getDoc(doc(chatRef, communityName));
          await updateDoc(doc(chatRef, communityName), {
            participants: arrayUnion(currentUserId)
          });
        } else {
          alert("Community not found");
          return;
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
  const [priv, setpriv] = useState(false);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
      <div className="w-full max-w-md card-brutal bg-white p-8">
        <h2 className="heading-brutal mb-6 text-2xl uppercase">{isCreating ? "CREATE" : "JOIN"} COMMUNITY</h2>
        <form onSubmit={handleCreateOrJoin}>
          <input
            type="text"
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder={isCreating ? "NEW COMMUNITY NAME" : "COMMUNITY ID TO JOIN"}
            className="input-brutal mb-6 w-full"
          />
          {isCreating && (
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
                    className="tag-brutal bg-blue-300 shadow-[2px_2px_0px_#000] flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="font-bold hover:text-black/50 text-base leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="mb-6 space-y-4">
            <label className="flex items-center cursor-pointer group">
              <div className="relative flex items-center justify-center w-6 h-6 border-2 border-black mr-3 shadow-[2px_2px_0px_#3b82f6] group-hover:-translate-y-0.5 transition-transform bg-white shrink-0">
                <input
                  type="checkbox"
                  checked={isCreating}
                  onChange={() => setIsCreating(!isCreating)}
                  className="absolute opacity-0 w-full h-full cursor-pointer"
                />
                {isCreating && <div className="w-3 h-3 bg-black"></div>}
              </div>
              <span className="subheading-brutal mt-1">{isCreating ? "CREATE NEW" : "JOIN EXISTING"}</span>
            </label>
            
            {isCreating && (
              <label className="flex items-center cursor-pointer group">
                <div className="relative flex items-center justify-center w-6 h-6 border-2 border-black mr-3 shadow-[2px_2px_0px_#3b82f6] group-hover:-translate-y-0.5 transition-transform bg-white shrink-0">
                  <input
                    type="checkbox"
                    checked={priv}
                    onChange={() => setpriv(!priv)}
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                  />
                  {priv && <div className="w-3 h-3 bg-black"></div>}
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
              {isCreating ? "CREATE" : "JOIN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateJoinCommunityModal;
