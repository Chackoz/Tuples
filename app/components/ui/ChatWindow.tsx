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
  getDoc
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
}

interface ChatWindowProps {
  currentUserId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId }) => {
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

        setChats(chatsWithNames);
      });

      return unsubscribe;
    };

    const unsubscribe = fetchAndListenToChats();
    return () => unsubscribe();
  }, [currentUserId]);

  useEffect(() => {
    if (selectedChatId) {
      const q = query(
        collection(db, "messages"),
        where("chatId", "==", selectedChatId),
        orderBy("timestamp")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Message
        );
        setMessages(newMessages);
      });
      return () => unsubscribe();
    }
  }, [selectedChatId]);

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
    await updateDoc(chatRef, {
      lastMessage: {
        content: newMessage,
        senderId: currentUserId,
        timestamp: new Date()
      }
    });

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
            className={`cursor-pointer p-4 hover:bg-gray-100 rounded-lg ${selectedChatId === chat.id ? "bg-blue-100"  : ""}`}
          >
            <div className="font-semibold">
              {chat.name
                ? chat.name
                : chat.participantNames
                  ? chat.participantNames.join(", ")
                  : "Loading..."}
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
                  {(((chats.find(chat => chat.id === selectedChatId)?.participants?.length ?? 0)>1)) && (
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
