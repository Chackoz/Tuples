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
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { User } from "@/app/types";
import {
  ArrowLeft,
  Send,
  Smile,
  Search,
  UserCircle,
  Users,
  MessageCircle
} from "lucide-react";

// Typescript interfaces
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
  type?: "private" | "community";
  unreadCounts: { [userId: string]: number };
}

interface ChatWindowProps {
  currentUserId: string;
  setIfUnread: (unread: boolean) => void;
}

const MESSAGES_PER_PAGE = 20;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUserId, setIfUnread }) => {
  // State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [chatType, setChatType] = useState<"all" | "private" | "community">("all");

  // Refs
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messagesCache = useRef<{ [chatId: string]: Message[] }>({});
  const usersCache = useRef<{ [key: string]: User }>({});
  const lastFetchTimestamp = useRef<{ [chatId: string]: number }>({});

  // Responsive State
  const [isMobileView, setIsMobileView] = useState(false);
  const [isChatListView, setIsChatListView] = useState(true);

  // Fetch Users
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

  // Listen to Chats
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
      setIfUnread(totalUnread > 0);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // Chat Filtering
  useEffect(() => {
    let filtered = chats;

    if (chatType !== "all") {
      filtered = filtered.filter((chat) => chat.type === chatType);
    }

    if (searchTerm) {
      filtered = filtered.filter((chat) => {
        const chatName = getChatName(chat).toLowerCase();
        const lastMessageContent = chat.lastMessage?.content.toLowerCase() || "";
        return (
          chatName.includes(searchTerm.toLowerCase()) ||
          lastMessageContent.includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredChats(filtered);
  }, [chats, searchTerm, chatType]);

  // Update Page Title
  useEffect(() => {
    document.title =
      totalUnreadCount > 0 ? `(${totalUnreadCount}) New Messages` : "Tuple";
  }, [totalUnreadCount]);

  // Responsive Check
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobileView();
    window.addEventListener("resize", checkMobileView);
    return () => window.removeEventListener("resize", checkMobileView);
  }, []);

  // Get Chat Name
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

  // Load Messages
  const loadMessages = useCallback(
    async (chatId: string, loadMore = false) => {
      const now = Date.now();

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
        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

      const updatedMessages = loadMore
        ? [...newMessages, ...(messagesCache.current[chatId] || [])]
        : newMessages;

      setMessages(updatedMessages);
      messagesCache.current[chatId] = updatedMessages;
      lastFetchTimestamp.current[chatId] = now;

      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        [`unreadCounts.${currentUserId}`]: 0
      });
    },
    [currentUserId]
  );

  // Real-time Message Listener
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

            const updatedMessages = [newMessage, ...prevMessages]
              .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

            messagesCache.current[selectedChatId] = updatedMessages;
            return updatedMessages;
          });
        }
      });
    });

    return () => unsubscribe();
  }, [selectedChatId, loadMessages]);

  // Send Message Handler
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

  // Emoji Selection Handler
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  // Scroll to Bottom Utility
  const scrollToBottom = useCallback((smooth = false) => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, []);

  // Scroll on Messages/Chat Change
  useEffect(() => {
    scrollToBottom(true);
  }, [messages, selectedChatId, scrollToBottom]);

  // Click Outside Emoji Picker Handler
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

   // Render Chat List
   const renderChatList = () => {
    return filteredChats.map((chat) => (
      <div
        key={chat.id}
        onClick={() => {
          setSelectedChatId(chat.id);
          if (isMobileView) setIsChatListView(false);
        }}
        className={`
          flex 
          cursor-pointer items-center 
          p-4 hover:bg-gray-100 
          ${selectedChatId === chat.id ? "bg-blue-100" : ""}
          border-b transition-colors duration-200
        `}
      >
        <div className="mr-4">
          {chat.type === "community" ? (
            <Users className="text-green-500" />
          ) : (
            <UserCircle />
          )}
        </div>
        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">{getChatName(chat)}</span>
            {chat.unreadCounts?.[currentUserId] > 0 && (
              <div className="rounded-full bg-blue-500 px-2 py-1 text-xs text-white">
                {chat.unreadCounts[currentUserId]}
              </div>
            )}
          </div>
          {chat.lastMessage && (
            <div className="mt-1 truncate text-sm text-gray-500">
              {chat.lastMessage.content}
            </div>
          )}
        </div>
      </div>
    ));
  };

  // Render Search Bar
  const renderSearchBar = () => (
    <div className="border-b bg-white p-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
            size={20}
          />
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => setChatType("all")}
            className={`rounded-md p-2 ${chatType === "all" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            <MessageCircle size={20} />
          </button>
          <button
            onClick={() => setChatType("private")}
            className={`rounded-md p-2 ${chatType === "private" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            <UserCircle size={20} />
          </button>
          <button
            onClick={() => setChatType("community")}
            className={`rounded-md p-2 ${chatType === "community" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            <Users size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`flex rounded-lg border shadow-sm md:h-[70vh] ${isMobileView ? "flex-col" : ""}`}
    >
      {/* Mobile Header for Chat Selection */}
      {isMobileView && !isChatListView && selectedChatId && (
        <div className="flex items-center bg-gray-100 p-4">
          <button onClick={() => setIsChatListView(true)} className="mr-4">
            <ArrowLeft />
          </button>
          <span className="text-xl font-semibold">
            {selectedChatId
              ? getChatName(chats.find((c) => c.id === selectedChatId)!)
              : ""}
          </span>
        </div>
      )}

      <div
        className={`
      custom-scrollbar 
      ${
        isMobileView
          ? `${isChatListView ? "block" : "hidden"}`
          : "w-1/3 border-r bg-gray-50"
      } 
      overflow-y-auto`}
      >
        {renderSearchBar()}
        {renderChatList()}
      </div>

      {/* Message Window - Responsive */}
      <div
        className={`
      flex flex-col 
      ${isMobileView ? `${!isChatListView ? "block" : "hidden"} w-full` : "w-2/3"}
    `}
      >
        {selectedChatId ? (
          <>
            <div
              ref={messageContainerRef}
              className="custom-scrollbar min-h-[50vh] flex-1 overflow-y-auto p-2 md:p-4"
            >
              {messages.length > 0 ? (
                <>
                  <button
                    onClick={() => loadMessages(selectedChatId, true)}
                    className="mb-4 text-blue-500 hover:underline"
                  >
                    Load Older Messages
                  </button>
                  {messages.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis()).map((message) => (
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
                      {chats.find((chat) => chat.id === selectedChatId)?.type ===
                        "community" && (
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
                  placeholder="Type a message"

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