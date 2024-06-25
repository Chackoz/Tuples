import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  arrayUnion,
  arrayRemove,
  increment
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { getUserById } from "@/app/utils/dbUtils";
import { User } from "@/app/types";

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: any;
  senderName?: string;
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
  unreadCounts: { [userId: string]: number };
}

interface ChatWindowProps {
  currentUserId: string;
  ifUnread: boolean;
  setifUnread: React.Dispatch<React.SetStateAction<boolean>>;
  state:boolean
}

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId, ifUnread, setifUnread ,state}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User>();

  const getUserById = useCallback(
    async (userId: string) => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnapshot = await getDoc(userRef);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data() as User;
          setUser(userData);

          return userData;
        } else {
          console.log("Document does not exist!");
          return null;
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    [currentUserId]
  );
  getUserById(currentUserId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchAndListenToChats = () => {
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUserId)
      );

      const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
        const chatList = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Chat
        );

        const chatsWithNames = await Promise.all(
          chatList.map(async (chat) => {
            const participantNames = await Promise.all(
              chat.participants
                .filter((id) => id !== currentUserId)
                .map(async (id) => {
                  const user = await getUserById(id);
                  return user ? user.name : "Unknown User";
                })
            );
            return { ...chat, participantNames };
          })
        );

        // Sort chats by lastMessage timestamp
        const sortedChats = chatsWithNames.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp?.toDate() || new Date(0);
          const timeB = b.lastMessage?.timestamp?.toDate() || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });

        setChats(sortedChats);

        // Check if there are any unread messages
        const hasUnreadMessages = sortedChats.some(chat => 
          chat.unreadCounts && chat.unreadCounts[currentUserId] > 0
        );
        setifUnread(hasUnreadMessages);
      });

      return unsubscribe;
    };

    const unsubscribe = fetchAndListenToChats();
    return () => unsubscribe();
  }, [currentUserId, setifUnread]);

  useEffect(() => {
    if (selectedChatId) {
      const q = query(
        collection(db, "messages"),
        where("chatId", "==", selectedChatId),
        orderBy("timestamp")
      );
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const newMessages = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Message
        );
        setMessages(newMessages);

        // Reset unread count for current user when opening a chat
        const chatRef = doc(db, "chats", selectedChatId);
        await updateDoc(chatRef, {
          [`unreadCounts.${currentUserId}`]: 0
        });

        // Check if there are any remaining unread messages in other chats
        const hasUnreadMessages = chats.some(chat => 
          chat.id !== selectedChatId && 
          chat.unreadCounts && 
          chat.unreadCounts[currentUserId] > 0
        );
        setifUnread(hasUnreadMessages);
      });
      return () => unsubscribe();
    }
  }, [selectedChatId, currentUserId, chats, setifUnread]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !selectedChatId) return;

    const selectedChat = chats.find(chat => chat.id === selectedChatId);

    await addDoc(collection(db, "messages"), {
      chatId: selectedChatId,
      senderId: currentUserId,
      content: newMessage,
      timestamp: new Date(),
      senderName: user?.name
    });

    const chatRef = doc(db, "chats", selectedChatId);
    const updateData: any = {
      lastMessage: {
        content: newMessage,
        senderId: currentUserId,
        timestamp: new Date()
      }
    };

    // Increment unread count for other participants
    selectedChat?.participants.forEach(participantId => {
      if (participantId !== currentUserId) {
        updateData[`unreadCounts.${participantId}`] = increment(1);
      }
    });

    await updateDoc(chatRef, updateData);

    setNewMessage("");
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      const lastMessage = messageContainerRef.current.lastElementChild;
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-[70vh] ">
      <div className="w-1/3 border-r overflow-y-auto custom-scrollbar rounded-lg">
        <h2 className="p-4 text-xl font-bold">Chats</h2>
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setSelectedChatId(chat.id)}
            className={`cursor-pointer p-4 hover:bg-gray-100 rounded-lg ${
              selectedChatId === chat.id ? "bg-blue-100" : ""
            }`}
          >
            <div className="font-semibold flex justify-between items-center">
              <span>
                {chat.name
                  ? chat.name
                  : chat.participantNames
                  ? chat.participantNames.join(", ")
                  : "Loading..."}
              </span>
              {chat.unreadCounts && chat.unreadCounts[currentUserId] > 0 && (
                <span className="bg-blue-500 text-white rounded-full text-xs w-8 h-8 flex justify-center items-center" >
                  {chat.unreadCounts[currentUserId]}
                </span>
              )}
            </div>
            {chat.lastMessage && (
              <div className="text-sm text-gray-500">
                {chat.lastMessage.content.substring(0, 30)}
                {chat.lastMessage.content.length > 30 ? "..." : ""}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex w-2/3 flex-col">
        <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar ">
          {messages.length > 0
            ? messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${message.senderId === currentUserId ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`inline-block rounded-lg p-2 ${message.senderId === currentUserId ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                  >
                    {message.content}
                  </div>
                  {(((chats.find(chat => chat.id === selectedChatId)?.participants?.length ?? 0)>2)) && (
                    <div className="mt-1 flex flex-col text-xs text-gray-500">
                      {message.senderName}
                    </div>
                  )}
                  <div className="mt-1 flex flex-col text-xs text-gray-500">
                    {message.timestamp.toDate().toLocaleString()}
                  </div>
                </div>
              ))
            : selectedChatId && (
                <div className="text-center text-gray-500">Start your conversation</div>
              )}
        </div>
        {selectedChatId ? (
          <form onSubmit={sendMessage} className="relative border-t p-4">
            <div ref={emojiPickerRef} className="absolute bottom-full mb-2">
              {showEmojiPicker && <EmojiPicker onEmojiClick={handleEmojiClick} />}
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="mr-2 rounded bg-gray-200 px-2 py-1"
              >
                😊
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="mr-2 flex-grow rounded border px-2 py-1"
                placeholder="Type a message..."
              />
              <button type="submit" className="rounded bg-blue-500 px-4 py-2 text-white">
                Send
              </button>
            </div>
          </form>
        ) : (
          <div className=" flex h-full w-full items-center justify-center text-xl">
            Select a chat to start conversation
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;