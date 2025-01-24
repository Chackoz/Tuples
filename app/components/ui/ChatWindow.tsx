import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { ArrowLeft, Send, Smile } from "lucide-react";

// Typescript interfaces with more precise typing
interface Message {
  id: string;
  senderId: string;
  chatId: string;
  content: string;
  timestamp: Timestamp;
  senderName?: string;
}

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Timestamp;
  };
  participantNames?: string[];
  name?: string;
  type?: string;
  unreadCounts: { [userId: string]: number };
}

interface ChatWindowProps {
  currentUserId: string;
}

const MESSAGES_PER_PAGE = 20;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId }) => {
  // State management with more explicit typing
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Refs for performance and caching
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messagesCache = useRef<{ [chatId: string]: Message[] }>({});
  const usersCache = useRef<{ [key: string]: User }>({});
  const lastFetchTimestamp = useRef<{ [chatId: string]: number }>({});

  // Fetch users on component mount
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

  // Listen to chats for the current user
  useEffect(() => {
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUserId),
      orderBy("lastMessage.timestamp", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatList = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Chat
      );

      setChats(chatList);

      const totalUnread = chatList.reduce(
        (sum, chat) => sum + (chat.unreadCounts?.[currentUserId] || 0),
        0
      );
      setTotalUnreadCount(totalUnread);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // Update page title based on unread count
  useEffect(() => {
    document.title =
      totalUnreadCount > 0 ? `(${totalUnreadCount}) New Messages` : "Tuple";
  }, [totalUnreadCount]);

  // Memoized function to get chat name or participant names
  const getChatName = useCallback(
    (chat: Chat) => {
      return (
        chat.name ||
        chat.participants
          .filter((id) => id !== currentUserId)
          .map((id) => users[id]?.name)
          .join(", ") ||
        "Loading..."
      );
    },
    [currentUserId, users]
  );

  // Load messages for a specific chat
  const loadMessages = useCallback(
    async (chatId: string, loadMore = false) => {
      const now = Date.now();

      // Check cache first
      if (
        !loadMore &&
        messagesCache.current[chatId] &&
        now - (lastFetchTimestamp.current[chatId] || 0) < CACHE_EXPIRY
      ) {
        setMessages(messagesCache.current[chatId]);
        return;
      }

      let messagesQuery = query(
        collection(db, "messages"),
        where("chatId", "==", chatId),
        orderBy("timestamp", "desc"),
        limit(MESSAGES_PER_PAGE)
      );

      const snapshot = await getDocs(messagesQuery);
      const newMessages = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Message)
        .reverse();

      const updatedMessages = loadMore
        ? [...(messagesCache.current[chatId] || []), ...newMessages]
        : newMessages;

      setMessages(updatedMessages);
      messagesCache.current[chatId] = updatedMessages;
      lastFetchTimestamp.current[chatId] = now;

      // Reset unread count for the chat
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        [`unreadCounts.${currentUserId}`]: 0
      });
    },
    [currentUserId]
  );

  // Real-time message listener
  useEffect(() => {
    if (!selectedChatId) return;

    loadMessages(selectedChatId);

    const messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", selectedChatId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newMessage = {
            id: change.doc.id,
            ...change.doc.data()
          } as Message;

          setMessages((prevMessages) => {
            if (prevMessages.some((msg) => msg.id === newMessage.id)) return prevMessages;

            const updatedMessages = [...prevMessages, newMessage].sort(
              (a, b) => a.timestamp.toMillis() - b.timestamp.toMillis()
            );

            messagesCache.current[selectedChatId] = updatedMessages;
            return updatedMessages;
          });
        }
      });
    });

    return () => unsubscribe();
  }, [selectedChatId, loadMessages]);

  // Send message handler
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !selectedChatId) return;

    const batch = writeBatch(db);

    const newMessageObj: Message = {
      id: Date.now().toString(),
      chatId: selectedChatId,
      senderId: currentUserId,
      content: newMessage,
      timestamp: Timestamp.now(),
      senderName: usersCache.current[currentUserId]?.name
    };

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

    chats
      .find((chat) => chat.id === selectedChatId)
      ?.participants.forEach((participantId) => {
        if (participantId !== currentUserId) {
          updateData[`unreadCounts.${participantId}`] =
            (chats.find((chat) => chat.id === selectedChatId)?.unreadCounts[
              participantId
            ] || 0) + 1;
        }
      });

    batch.update(chatRef, updateData);

    try {
      await batch.commit();
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Emoji selection handler
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  // Scroll to bottom utility
  const scrollToBottom = useCallback((smooth = false) => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, []);

  // Scroll on messages/chat change
  useEffect(() => {
    scrollToBottom(true);
  }, [messages, selectedChatId, scrollToBottom]);

  const [isMobileView, setIsMobileView] = useState(false);
  const [isChatListView, setIsChatListView] = useState(true);

  // Add responsive check
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);



  // Click outside emoji picker handler
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
    <div className={`flex md:h-[70vh] rounded-lg border shadow-sm ${isMobileView ? 'flex-col' : ''}`}>
      {/* Mobile Header for Chat Selection */}
      {isMobileView && isChatListView && (
        <div className="p-4 bg-gray-100 text-xl font-semibold">
          Your Chats
        </div>
      )}

      {/* Mobile Header for Chat Window */}
      {isMobileView && !isChatListView && selectedChatId && (
        <div className="flex items-center p-4 bg-gray-100">
          <button 
            onClick={() => setIsChatListView(true)} 
            className="mr-4"
          >
            <ArrowLeft />
          </button>
          <span className="text-xl font-semibold">
            {selectedChatId ? getChatName(chats.find(c => c.id === selectedChatId)!) : ''}
          </span>
        </div>
      )}

      {/* Chat List Sidebar - Responsive */}
      <div 
        className={`
          custom-scrollbar 
          ${isMobileView 
            ? `${isChatListView ? 'block' : 'hidden'}` 
            : 'w-1/3 border-r bg-gray-50'
          } 
          overflow-y-auto`
        }
      >
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => {
              setSelectedChatId(chat.id);
              if (isMobileView) setIsChatListView(false);
            }}
            className={`
              cursor-pointer p-4 hover:bg-gray-100 
              ${selectedChatId === chat.id ? "bg-blue-100" : ""}
            `}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">
                {getChatName(chat)}
              </span>
              {chat.unreadCounts?.[currentUserId] > 0 && (
                <span className="rounded-full bg-blue-500 px-2 py-1 text-xs text-white">
                  {chat.unreadCounts[currentUserId]}
                </span>
              )}
            </div>
            {chat.lastMessage && (
              <div className="mt-1 text-sm text-gray-500">
                {chat.lastMessage.content.substring(0, 30)}
                {chat.lastMessage.content.length > 30 ? "..." : ""}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Message Window - Responsive */}
      <div 
        className={`
          flex flex-col 
          ${isMobileView 
            ? `${!isChatListView ? 'block' : 'hidden'} w-full` 
            : 'w-2/3'
          }
        `}
      >
        {selectedChatId ? (
          <>
            <div
              ref={messageContainerRef}
              className="custom-scrollbar flex-1 overflow-y-auto md:p-4 p-2 min-h-[50vh]"
            >
              {messages.length > 0 ? (
                <>
                  <button
                    onClick={() => loadMessages(selectedChatId, true)}
                    className="mb-4 text-blue-500 hover:underline"
                  >
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
                        className={`inline-block max-w-[400px] rounded-lg p-2 text-justify ${
                          message.senderId === currentUserId
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {message.content}
                      </div>
                      {chats.find((chat) => chat.id === selectedChatId)?.type === "community" && (
                        <div className="mt-1 text-xs text-gray-500">
                          {message.senderName}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-gray-500">
                        {message.timestamp.toDate().toLocaleString()}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Start your conversation
                </div>
              )}
            </div>
            <form onSubmit={sendMessage} className="border-t p-4">
              <div ref={emojiPickerRef} className="absolute bottom-full mb-2">
                {showEmojiPicker && <EmojiPicker onEmojiClick={handleEmojiClick} />}
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="mr-2 rounded bg-gray-200 px-2 py-1"
                >
                  <Smile size={20} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="mr-2 flex-grow rounded border px-3 py-2"
                  placeholder="Type a message..."
                />
                <button
                  type="submit"
                  className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl text-gray-500">
            Select a chat to start conversation
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;