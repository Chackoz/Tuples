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
  getDocs,
  limit,
  startAfter,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { User } from "@/app/types";

interface Message {
  id: string;
  senderId: string;
  chatId: string;
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
  state: boolean;
}

const MESSAGES_PER_PAGE = 20;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId, ifUnread, setifUnread, state }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<Timestamp | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messagesCache = useRef<{ [chatId: string]: Message[] }>({});
  const usersCache = useRef<{ [key: string]: User }>({});
  const lastFetchTimestamp = useRef<{ [chatId: string]: number }>({});

  useEffect(() => {
    const fetchUsers = async () => {
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      const usersData: { [key: string]: User } = {};
      usersSnapshot.forEach((doc) => {
        usersData[doc.id] = doc.data() as User;
      });
      usersCache.current = usersData;
      setUsers(usersData);
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUserId),
      orderBy("lastMessage.timestamp", "desc")
    );
    
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatList);
  
      const totalUnread = chatList.reduce((sum, chat) => 
        sum + (chat.unreadCounts && chat.unreadCounts[currentUserId] || 0), 0);
      setTotalUnreadCount(totalUnread);
  
      setifUnread(totalUnread > 0);
  
      if (selectedChatId) {
        loadMessages(selectedChatId);
      }
    });
  
    return () => unsubscribe();
  }, [currentUserId, selectedChatId, setifUnread]);

  useEffect(() => {
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) New Messages`;
    } else {
      document.title = 'Tuple';
    }
  }, [totalUnreadCount]);

  const loadMessages = useCallback(async (chatId: string, loadMore = false) => {
    const now = Date.now();
    if (!loadMore && messagesCache.current[chatId] && now - (lastFetchTimestamp.current[chatId] || 0) < CACHE_EXPIRY) {
      setMessages(messagesCache.current[chatId]);
      return;
    }

    let messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("timestamp", "asc"),  
      limit(MESSAGES_PER_PAGE)
    );

    if (loadMore && lastMessageTimestamp) {
      messagesQuery = query(messagesQuery, startAfter(lastMessageTimestamp));
    }

    const snapshot = await getDocs(messagesQuery);
    const newMessages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message));

    const updatedMessages = loadMore ? [...newMessages, ...(messagesCache.current[chatId] || [])] : newMessages;    setMessages(updatedMessages);
    messagesCache.current[chatId] = updatedMessages;
    lastFetchTimestamp.current[chatId] = now;

    if (newMessages.length > 0) {
      setLastMessageTimestamp(newMessages[newMessages.length - 1].timestamp);
    }

    if (!loadMore) {
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        [`unreadCounts.${currentUserId}`]: 0
      });
      setTotalUnreadCount(prevCount => prevCount - (chats.find(chat => chat.id === chatId)?.unreadCounts[currentUserId] || 0));
    }
  }, [currentUserId, lastMessageTimestamp, chats]);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
      
      const messagesQuery = query(
        collection(db, "messages"),
        where("chatId", "==", selectedChatId),
        orderBy("timestamp", "desc")
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newMessage = { id: change.doc.id, ...change.doc.data() } as Message;
            setMessages(prevMessages => {
              if (!prevMessages.some(msg => msg.id === newMessage.id)) {
                const updatedMessages = [...prevMessages, newMessage];
                messagesCache.current[selectedChatId] = updatedMessages;
                return updatedMessages;
              }
              return prevMessages;
            });
          }
        });
      });

      return () => unsubscribe();
    }
  }, [selectedChatId, loadMessages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !selectedChatId) return;

    const batch = writeBatch(db);

    const newMessageObj: Message = {
      id: Date.now().toString(), // Temporary ID
      chatId: selectedChatId,
      senderId: currentUserId,
      content: newMessage,
      timestamp: Timestamp.now(),
      senderName: usersCache.current[currentUserId]?.name
    };

    setMessages(prevMessages => [...prevMessages, newMessageObj]);
    messagesCache.current[selectedChatId] = [...(messagesCache.current[selectedChatId] || []), newMessageObj];

    const messageRef = doc(collection(db, "messages"));
    batch.set(messageRef, newMessageObj);

    const chatRef = doc(db, "chats", selectedChatId);
    const updateData: any = {
      lastMessage: {
        content: newMessage,
        senderId: currentUserId,
        timestamp: Timestamp.now()
      }
    };

    chats.find(chat => chat.id === selectedChatId)?.participants.forEach(participantId => {
      if (participantId !== currentUserId) {
        updateData[`unreadCounts.${participantId}`] = (chats.find(chat => chat.id === selectedChatId)?.unreadCounts[participantId] || 0) + 1;
      }
    });

    batch.update(chatRef, updateData);

    try {
      await batch.commit();
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== newMessageObj.id));
      messagesCache.current[selectedChatId] = messagesCache.current[selectedChatId].filter(msg => msg.id !== newMessageObj.id);
    }

    setNewMessage("");
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const scrollToBottom = (smooth = false) => {
    if (messageContainerRef.current) {
      const scrollOptions: ScrollIntoViewOptions = {
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      };
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };
  

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages]);
  
  
  useEffect(() => {
    scrollToBottom(false);
  }, [selectedChatId]);

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

  return (
    <div className="flex h-[70vh]">
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
                {chat.name ||
                  chat.participants
                    .filter((id) => id !== currentUserId)
                    .map((id) => users[id]?.name)
                    .join(", ") ||
                  "Loading..."}
              </span>
              {chat.unreadCounts && chat.unreadCounts[currentUserId] > 0 && (
                <span className="bg-blue-500 text-white rounded-full text-xs w-8 h-8 flex justify-center items-center">
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
        <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {messages.length > 0 ? (
            <>
             <button onClick={() => loadMessages(selectedChatId!, true)} className="mb-4 text-blue-500">
  Load Older Messages
</button>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${
                    message.senderId === currentUserId ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`inline-block rounded-lg p-2 ${
                      message.senderId === currentUserId ? "bg-blue-500 text-white" : "bg-gray-200"
                    }`}
                  >
                    {message.content}
                  </div>
                  {chats.find((chat) => chat.id === selectedChatId)?.participants.length! > 2 && (
                    <div className="mt-1 flex flex-col text-xs text-gray-500">
                      {message.senderName}
                    </div>
                  )}
                  <div className="mt-1 flex flex-col text-xs text-gray-500">
                    {message.timestamp.toDate().toLocaleString()}
                  </div>
                </div>
              ))}
            </>
          ) : (
            selectedChatId && (
              <div className="text-center text-gray-500">Start your conversation</div>
            )
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
          <div className="flex h-full w-full items-center justify-center text-xl">
            Select a chat to start conversation
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;