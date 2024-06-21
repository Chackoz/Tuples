import React, { useState } from 'react';
import { addDoc, collection, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/app/lib/firebaseConfig';


interface CreateJoinCommunityModalProps {
  onClose: () => void;
  onCreateOrJoin: () => void;
  user: { name: string };
}

function CreateJoinCommunityModal({ onClose, onCreateOrJoin, user }: CreateJoinCommunityModalProps) {
  const [communityName, setCommunityName] = useState('');
  const [isCreating, setIsCreating] = useState(true);

  const handleCreateOrJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityName.trim()) return;

    try {
      if (isCreating) {
        await addDoc(collection(db, 'communities'), {
          name: communityName,
          creator: user.name,
          members: [user.name],
        });
      } else {
        const communitiesRef = collection(db, 'communities');
        const communityDoc = await getDoc(doc(communitiesRef, communityName));
        
        if (communityDoc.exists()) {
          await updateDoc(doc(communitiesRef, communityName), {
            members: arrayUnion(user.name)
          });
        } else {
          alert('Community not found');
          return;
        }
      }
      onCreateOrJoin();
      onClose();
    } catch (error) {
      console.error("Error creating/joining community:", error);
      alert(`Error ${isCreating ? 'creating' : 'joining'} community. Please try again.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-xl mb-4">{isCreating ? 'Create' : 'Join'} Community</h2>
        <form onSubmit={handleCreateOrJoin}>
          <input
            type="text"
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder={isCreating ? "New Community Name" : "Community ID to Join"}
            className="w-full p-2 border rounded mb-4"
          />
          <div className="flex justify-between items-center mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isCreating}
                onChange={() => setIsCreating(!isCreating)}
                className="mr-2"
              />
              {isCreating ? 'Create New' : 'Join Existing'}
            </label>
          </div>
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
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {isCreating ? 'Create' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateJoinCommunityModal;