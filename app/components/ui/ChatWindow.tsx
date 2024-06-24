import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, orderBy, onSnapshot, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { getUserById } from '@/app/utils/dbUtils';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: any;
}

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: any;
  };
  participantNames?: string[];
  name?: string;
}

interface ChatWindowProps {
  currentUserId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  const messageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchAndListenToChats = () => {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUserId)
      );
  
      const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
        const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
        
       
        const chatsWithNames = await Promise.all(chatList.map(async (chat) => {
          const participantNames = await Promise.all(
            chat.participants
              .filter(id => id !== currentUserId)
              .map(async (id) => {
                const user = await getUserById(id);
                return user ? user.name : 'Unknown User';
              })
          );
          return { ...chat, participantNames };
        }));
  
        setChats(chatsWithNames);
      });
  
      return unsubscribe;
    };
  
    const unsubscribe = fetchAndListenToChats();
    return () => unsubscribe();
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
       // console.log("New messages: ", newMessages);
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
    
    const chatRef = doc(db, 'chats', selectedChatId);
    await updateDoc(chatRef, {
      lastMessage: {
        content: newMessage,
        senderId: currentUserId,
        timestamp: new Date()
      }
    })

    setNewMessage('');
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      const lastMessage = messageContainerRef.current.lastElementChild;
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-[70vh] ">
      <div className="w-1/3 border-r">
        <h2 className="text-xl font-bold p-4">Chats</h2>
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setSelectedChatId(chat.id)}
            className={`p-4 cursor-pointer hover:bg-gray-100 ${selectedChatId === chat.id ? 'bg-blue-100' : ''}`}
          >
            <div className="font-semibold">
            {chat.name ? chat.name : chat.participantNames ? chat.participantNames.join(', ') : 'Loading...'}
            </div>
            {chat.lastMessage && (
              <div className="text-sm text-gray-500">
                {chat.lastMessage.content.substring(0, 30)}
                {chat.lastMessage.content.length > 30 ? '...' : ''}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="w-2/3 flex flex-col">
        <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-4">
         {messages.length > 0  ?  messages.map((message) => (
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
          )) : selectedChatId && <div className="text-center text-gray-500">Start your conversation</div>
          }
        </div>
       {
        selectedChatId ?  <form onSubmit={sendMessage} className="border-t p-4 relative">
        <div ref={emojiPickerRef} className="absolute bottom-full mb-2">
          {showEmojiPicker && (
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          )}
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="px-2 py-1 bg-gray-200 rounded mr-2"
          >
            😊
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow border rounded px-2 py-1 mr-2"
            placeholder="Type a message..."
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
            Send
          </button>
        </div>
      </form> : <div className=' w-full h-full flex justify-center items-center text-xl'>Select a chat to start conversation</div>
       }
      </div>
    </div>
  );
};

export default ChatWindow;
