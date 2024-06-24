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
          name: communityName
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
      alert(
        `Error ${isCreating ? "creating" : "joining"} community. Please try again. ${currentUserId}`
      );
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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl">{isCreating ? "Create" : "Join"} Community</h2>
        <form onSubmit={handleCreateOrJoin}>
          <input
            type="text"
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder={isCreating ? "New Community Name" : "Community ID to Join"}
            className="mb-4 w-full rounded border p-2"
          />
          {isCreating && (
            <div className="mb-4">
              <div className="mb-2 flex">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder="Add a tag"
                  className="flex-grow rounded-l border p-2"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="rounded-r bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="flex items-center rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 font-bold text-blue-800 hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mb-4 flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isCreating}
                onChange={() => setIsCreating(!isCreating)}
                className="mr-2"
              />
              {isCreating ? "Create New" : "Join Existing"}
            </label>
          </div>
          {isCreating && (
            <div className="mb-4 flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={priv}
                  onChange={() => setpriv(true)}
                  className="mr-2"
                />
                Private Community
              </label>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              {isCreating ? "Create" : "Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateJoinCommunityModal;
