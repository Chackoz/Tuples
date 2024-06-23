import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: any;
}

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: { content: string; timestamp: any; };
}

interface ChatWindowProps {
  currentUserId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUserId)
      );
      const chatSnapshot = await getDocs(chatsQuery);
      const chatList = chatSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatList);
    };
    fetchChats();
  }, [currentUserId]);

  useEffect(() => {
    if (selectedChatId) {
        console.log("Selected chat id: ", selectedChatId);
      const q = query(
        collection(db, 'messages'),
        where('chatId', '==', selectedChatId),
        orderBy('timestamp')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        console.log("New messages: ", newMessages);
        setMessages(newMessages);
      });
      return () => unsubscribe();
    }
  }, [selectedChatId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !selectedChatId) return;

    await addDoc(collection(db, 'messages'), {
      chatId: selectedChatId,
      senderId: currentUserId,
      content: newMessage,
      timestamp: new Date()
    });

    setNewMessage('');
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/3 border-r">
        <h2 className="text-xl font-bold p-4">Chats</h2>
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setSelectedChatId(chat.id)}
            className={`p-4 cursor-pointer hover:bg-gray-100 ${selectedChatId === chat.id ? 'bg-blue-100' : ''}`}
          >
            <div className="font-semibold">
              {chat.participants.filter(p => p !== currentUserId).join(', ')}
            </div>
            {chat.lastMessage && (
              <div className="text-sm text-gray-500">
                {chat.lastMessage.content.substring(0, 30)}...
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="w-2/3 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${message.senderId === currentUserId ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block p-2 rounded-lg ${message.senderId === currentUserId ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                {message.content}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {message.timestamp.toDate().toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="border-t p-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="Type a message..."
          />
          <button type="submit" className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
