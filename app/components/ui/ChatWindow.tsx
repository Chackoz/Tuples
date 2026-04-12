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

  const getChatName = useCallback(
    (chat: Chat) => {
      // Small optimization: don't compute names if participants are empty
      if (!chat) return "";
      return (
        chat.name ||
        chat.participants
          .filter((id) => id !== currentUserId)
          .map((id) => users[id]?.name || "Unknown")
          .join(", ") ||
        "Unnamed Chat"
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
          p-4 border-b-2 border-black transition-all duration-150
          ${selectedChatId === chat.id ? "bg-blue-500 text-white" : "bg-white hover:bg-[#f0f0f0] text-black"}
        `}
      >
        <div className={`mr-4 ${selectedChatId === chat.id ? "text-white" : "text-black"}`}>
          {chat.type === "community" ? (
            <Users />
          ) : (
            <UserCircle />
          )}
        </div>
        <div className="flex-grow w-[60%]">
          <div className="flex items-center justify-between w-full">
            <span className="subheading-brutal text-sm truncate pr-2 w-full">{getChatName(chat)}</span>
            {chat.unreadCounts?.[currentUserId] > 0 && (
              <div className="rounded-none bg-black px-2 py-0.5 text-xs text-white font-bold shadow-[2px_2px_0px_#3b82f6]">
                {chat.unreadCounts[currentUserId]}
              </div>
            )}
          </div>
          {chat.lastMessage && (
            <div className={`mt-1 truncate text-xs font-bold w-full ${selectedChatId === chat.id ? "text-white/80" : "text-black/50"}`}>
              {chat.lastMessage.content}
            </div>
          )}
        </div>
      </div>
    ));
  };

  // Render Search Bar
  const renderSearchBar = () => (
    <div className="border-b-2 border-black bg-white p-4">
      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-brutal pl-10 h-10 py-1 text-sm bg-white"
          />
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50"
            size={16}
          />
        </div>
        <div className="flex space-x-2 w-full">
          <button
            onClick={() => setChatType("all")}
            className={`btn-secondary flex-1 py-1 px-0 flex justify-center items-center ${chatType === "all" ? "bg-blue-500 text-white shadow-[2px_2px_0px_#000] border-black" : "shadow-none hover:shadow-[2px_2px_0px_#3b82f6] border-black/20 text-black/50"}`}
          >
            <MessageCircle size={16} />
          </button>
          <button
            onClick={() => setChatType("private")}
            className={`btn-secondary flex-1 py-1 px-0 flex justify-center items-center ${chatType === "private" ? "bg-blue-500 text-white shadow-[2px_2px_0px_#000] border-black" : "shadow-none hover:shadow-[2px_2px_0px_#3b82f6] border-black/20 text-black/50"}`}
          >
            <UserCircle size={16} />
          </button>
          <button
            onClick={() => setChatType("community")}
            className={`btn-secondary flex-1 py-1 px-0 flex justify-center items-center ${chatType === "community" ? "bg-blue-500 text-white shadow-[2px_2px_0px_#000] border-black" : "shadow-none hover:shadow-[2px_2px_0px_#3b82f6] border-black/20 text-black/50"}`}
          >
            <Users size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`flex card-brutal w-full p-0 flex-row overflow-hidden shadow-[4px_4px_0px_#3b82f6] ${isMobileView ? "flex-col border-r-0 md:h-[70vh] h-[80vh]" : "h-full"}`}
    >
      {/* Mobile Header for Chat Selection */}
      {isMobileView && !isChatListView && selectedChatId && (
        <div className="flex items-center justify-between border-b-2 border-black bg-[#f0f0f0] p-4 text-black w-full shrink-0 h-[60px]">
          <button onClick={() => setIsChatListView(true)} className="btn-secondary w-8 h-8 p-0 flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <span className="subheading-brutal text-lg truncate w-[80%] text-center">
            {selectedChatId
              ? getChatName(chats.find((c) => c.id === selectedChatId)!)
              : ""}
          </span>
          <div className="w-8"></div>
        </div>
      )}

      {/* Sidebar List */}
      <div
        className={`custom-scrollbar ${
          isMobileView
            ? `${isChatListView ? "flex" : "hidden"} w-full h-full border-r-0 flex-col`
            : "flex w-1/3 border-r-2 border-black bg-white flex-col h-full shrink-0"
        } overflow-y-auto`}
      >
        <div className="shrink-0">{renderSearchBar()}</div>
        <div className="flex-1 overflow-y-auto">{renderChatList()}</div>
      </div>

      {/* Message Window - Responsive */}
      <div
        className={`flex-col bg-[#f0f0f0] relative
      ${isMobileView ? `${!isChatListView ? "flex" : "hidden"} w-full h-[calc(100%-60px)]` : "flex w-2/3 h-full"}
    `}
      >
        {selectedChatId ? (
          <>
            {!isMobileView && (
               <div className="flex items-center border-b-2 border-black bg-white p-4 h-[75px] shrink-0">
                 <span className="subheading-brutal text-lg truncate flex-1">
                   {getChatName(chats.find((c) => c.id === selectedChatId)!)}
                 </span>
               </div>
            )}
            <div
              ref={messageContainerRef}
              className="custom-scrollbar flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative"
            >
              {/* Texture for Chat background */}
              <div
                className="pointer-events-none fixed inset-0 z-0 opacity-50"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
                  backgroundSize: "32px 32px",
                }}
              />
              {messages.length > 0 ? (
                <div className="flex flex-col z-10 w-full">
                  <button
                    onClick={() => loadMessages(selectedChatId, true)}
                    className="mb-8 p-2 rounded-full border-2 border-black bg-white self-center shadow-[2px_2px_0px_#3b82f6] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_#3b82f6] transition-all text-xs font-bold"
                  >
                    Load Older
                  </button>
                  {messages.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis()).map((message) => (
                    <div
                      key={message.id}
                      className={`mb-4 flex flex-col max-w-[70%] ${
                        message.senderId === currentUserId ? "self-end items-end" : "self-start items-start"
                      }`}
                    >
                      <div
                        className={`inline-block p-3 border-2 border-black font-medium text-sm leading-relaxed ${
                          message.senderId === currentUserId
                            ? "bg-blue-500 text-white shadow-[4px_4px_0px_#000]"
                            : "bg-white text-black shadow-[4px_4px_0px_#3b82f6]"
                        }`}
                      >
                        {message.content}
                      </div>
                      {chats.find((chat) => chat.id === selectedChatId)?.type === "community" && message.senderId !== currentUserId && (
                        <div className="mt-2 label-brutal text-black/50 px-1">
                          {message.senderName || "User"}
                        </div>
                      )}
                      <div className="mt-1 label-brutal text-black/40 px-1">
                        {message.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center label-brutal text-black/50 z-10">
                  Start your conversation
                </div>
              )}
            </div>
            <form onSubmit={sendMessage} className="border-t-2 border-black bg-white p-4 h-[80px] shrink-0 z-10">
              <div ref={emojiPickerRef} className="absolute bottom-full mb-2 z-50 right-2">
                {showEmojiPicker && <EmojiPicker onEmojiClick={handleEmojiClick} />}
              </div>
              <div className="flex items-center gap-2 h-full">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="btn-secondary h-full aspect-square flex items-center justify-center p-0"
                >
                  <Smile size={20} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="input-brutal h-full m-0 shadow-none border-2 border-black flex-1 focus:shadow-none bg-[#f0f0f0]"
                  placeholder="Type a message..."
                />
                <button
                  type="submit"
                  className="btn-primary h-full aspect-square flex items-center justify-center p-0"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-xl z-10">
            <MessageCircle size={48} className="mb-4 text-blue-500 max-h-[10%]" />
            <span className="heading-brutal text-center">Select a chat to start conversation</span>
          </div>
        )}
      </div>
    </div>
  );
};


export default ChatWindow;