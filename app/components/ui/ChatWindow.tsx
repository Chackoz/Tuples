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
  writeBatch,
  arrayUnion,
  arrayRemove,
  deleteDoc
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
  MessageCircle,
  Briefcase,
  Settings
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
  type?: "private" | "community" | "project";
  projectId?: string;
  admins?: string[];
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
  const [chatType, setChatType] = useState<"all" | "private" | "community" | "project">("all");

  // Refs
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messagesCache = useRef<{ [chatId: string]: Message[] }>({});
  const usersCache = useRef<{ [key: string]: User }>({});
  const lastFetchTimestamp = useRef<{ [chatId: string]: number }>({});

  // Responsive State
  const [isMobileView, setIsMobileView] = useState(false);
  const [isChatListView, setIsChatListView] = useState(true);

  // Group Management State
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");

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

  // Close group management when selected chat changes
  useEffect(() => {
    setShowGroupManagement(false);
  }, [selectedChatId]);

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

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !selectedChatId) return;

    try {
      const q = query(collection(db, "users"), where("email", "==", newAdminEmail.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("User with this email not found.");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const newAdminId = userDoc.id;

      const chatRef = doc(db, "chats", selectedChatId);
      
      // Update the document to include the new admin
      // using arrayUnion to create the array if it doesn't exist
      await updateDoc(chatRef, {
        admins: arrayUnion(newAdminId),
        participants: arrayUnion(newAdminId) // ensure they are also in the chat
      });

      setNewAdminEmail("");
      alert("Admin added successfully.");
    } catch (error) {
      console.error("Error adding admin:", error);
      alert("Failed to add admin.");
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!selectedChatId) return;
    if (adminId === currentUserId) {
      alert("You cannot remove yourself.");
      return;
    }

    try {
      const chatRef = doc(db, "chats", selectedChatId);
      await updateDoc(chatRef, {
        admins: arrayRemove(adminId)
      });
      alert("Admin removed successfully.");
    } catch (error) {
      console.error("Error removing admin:", error);
      alert("Failed to remove admin.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedChatId) return;
    if (memberId === currentUserId) {
      alert("You cannot remove yourself.");
      return;
    }

    if (!window.confirm("Are you sure you want to remove this member?")) return;

    try {
      const chatRef = doc(db, "chats", selectedChatId);
      await updateDoc(chatRef, {
        participants: arrayRemove(memberId),
        admins: arrayRemove(memberId)
      });
      alert("Member removed successfully.");
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member.");
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedChatId) return;
    
    if (!window.confirm("Are you sure you want to completely delete this group? This action cannot be undone.")) return;

    try {
      const chatRef = doc(db, "chats", selectedChatId);
      await deleteDoc(chatRef);
      setSelectedChatId(null);
      setShowGroupManagement(false);
      alert("Group deleted successfully.");
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group.");
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
          p-4 border-b border-gray-200 transition-all duration-150
          ${selectedChatId === chat.id ? "bg-blue-500 text-white" : "bg-white hover:bg-gray-50 text-gray-900"}
        `}
      >
        <div className={`mr-4 ${selectedChatId === chat.id ? "text-white" : "text-gray-900"}`}>
          {chat.type === "community" ? (
            <Users />
          ) : chat.type === "project" ? (
            <Briefcase />
          ) : (
            <UserCircle />
          )}
        </div>
        <div className="flex-grow w-[60%]">
          <div className="flex items-center justify-between w-full">
            <span className="subheading-brutal text-sm truncate pr-2 w-full">{getChatName(chat)}</span>
            {chat.unreadCounts?.[currentUserId] > 0 && (
              <div className="rounded-none bg-gray-800 px-2 py-0.5 text-xs text-white font-bold shadow-sm">
                {chat.unreadCounts[currentUserId]}
              </div>
            )}
          </div>
          {chat.lastMessage && (
            <div className={`mt-1 truncate text-xs font-bold w-full ${selectedChatId === chat.id ? "text-white/80" : "text-gray-900/50"}`}>
              {chat.lastMessage.content}
            </div>
          )}
        </div>
      </div>
    ));
  };

  // Render Search Bar
  const renderSearchBar = () => (
    <div className="border-b border-gray-200 bg-white p-4">
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900/50"
            size={16}
          />
        </div>
        <div className="flex space-x-2 w-full">
          <button
            onClick={() => setChatType("all")}
            className={`btn-secondary flex-1 py-1 px-0 flex justify-center items-center ${chatType === "all" ? "bg-blue-500 text-white shadow-sm border-gray-200" : "shadow-none hover:shadow-sm border-gray-200/20 text-gray-900/50"}`}
          >
            <MessageCircle size={16} />
          </button>
          <button
            onClick={() => setChatType("private")}
            className={`btn-secondary flex-1 py-1 px-0 flex justify-center items-center ${chatType === "private" ? "bg-blue-500 text-white shadow-sm border-gray-200" : "shadow-none hover:shadow-sm border-gray-200/20 text-gray-900/50"}`}
          >
            <UserCircle size={16} />
          </button>
          <button
            onClick={() => setChatType("community")}
            className={`btn-secondary flex-1 py-1 px-0 flex justify-center items-center ${chatType === "community" ? "bg-blue-500 text-white shadow-sm border-gray-200" : "shadow-none hover:shadow-sm border-gray-200/20 text-gray-900/50"}`}
          >
            <Users size={16} />
          </button>
          <button
            onClick={() => setChatType("project")}
            title="Projects"
            className={`btn-secondary flex-1 py-1 px-0 flex justify-center items-center ${chatType === "project" ? "bg-blue-500 text-white shadow-sm border-gray-200" : "shadow-none hover:shadow-sm border-gray-200/20 text-gray-900/50"}`}
          >
            <Briefcase size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`flex card-brutal w-full p-0 flex-row overflow-hidden shadow-sm ${isMobileView ? "flex-col border-r-0 md:h-[70vh] h-[80vh]" : "h-full"}`}
    >
      {/* Mobile Header for Chat Selection */}
      {isMobileView && !isChatListView && selectedChatId && (
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4 text-gray-900 w-full shrink-0 h-[60px]">
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
            : "flex w-1/3 border-r border-gray-200 bg-white flex-col h-full shrink-0"
        } overflow-y-auto`}
      >
        <div className="shrink-0">{renderSearchBar()}</div>
        <div className="flex-1 overflow-y-auto">{renderChatList()}</div>
      </div>

      {/* Message Window - Responsive */}
      <div
        className={`flex-col bg-gray-50 relative
      ${isMobileView ? `${!isChatListView ? "flex" : "hidden"} w-full h-[calc(100%-60px)]` : "flex w-2/3 h-full"}
    `}
      >
        {selectedChatId ? (
          <>
            {!isMobileView && (
               <div className="flex items-center border-b border-gray-200 bg-white p-4 h-[75px] shrink-0">
                 <span className="subheading-brutal text-lg truncate flex-1">
                   {getChatName(chats.find((c) => c.id === selectedChatId)!)}
                 </span>
                 {(chats.find((c) => c.id === selectedChatId)?.type === "community" || chats.find((c) => c.id === selectedChatId)?.type === "project") &&
                  (chats.find((c) => c.id === selectedChatId)?.admins?.includes(currentUserId) || chats.find((c) => c.id === selectedChatId)?.participants[0] === currentUserId) && (
                   <button 
                     onClick={() => setShowGroupManagement(true)} 
                     className="btn-secondary h-10 w-10 flex items-center justify-center p-0 transition-transform hover:-translate-y-1 hover:shadow-sm relative"
                     title="Manage Group"
                   >
                     <Settings size={18} />
                   </button>
                 )}
               </div>
            )}

            {/* Group Management Overlay */}
            {showGroupManagement && selectedChatId && (
              <div className="absolute top-[75px] right-0 w-[300px] border-l border-b border-gray-200 bg-white shadow-lg p-4 z-50 flex flex-col custom-scrollbar overflow-y-auto max-h-[80%]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="heading-brutal text-md">Manage Admins</h3>
                  <button onClick={() => setShowGroupManagement(false)} className="text-gray-900 border border-gray-200 aspect-square w-8 hover:bg-gray-100 flex items-center justify-center font-bold text-xs shadow-sm bg-white">
                    X
                  </button>
                </div>
                
                <form onSubmit={handleAddAdmin} className="flex gap-2 w-full mb-6">
                  <input
                    type="email"
                    placeholder="User Email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="input-brutal w-full h-[32px] py-1 text-sm shadow-none"
                    required
                  />
                  <button type="submit" className="btn-primary py-1 px-3 text-sm h-[32px]">
                    Add
                  </button>
                </form>

                <h4 className="heading-brutal text-sm mb-2 opacity-70">Current Admins</h4>
                <div className="flex flex-col gap-2">
                  {(chats.find((c) => c.id === selectedChatId)?.admins || [chats.find((c) => c.id === selectedChatId)?.participants[0]])?.map((adminId) => {
                    if (typeof adminId !== 'string') return null;
                    const adminUser = users[adminId];
                    if (!adminUser) return null;
                    return (
                      <div key={adminId} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-2 text-sm shadow-sm gap-2">
                        <span className="truncate flex-1 font-bold">{adminUser.name}</span>
                        {adminId !== currentUserId && (
                          <button
                            onClick={() => handleRemoveAdmin(adminId)}
                            className="bg-red-500 text-white rounded-none font-bold text-[10px] px-2 py-1 hover:-translate-y-1 shadow-sm transition-transform shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <h4 className="heading-brutal text-sm mb-2 mt-6 opacity-70">Current Members</h4>
                <div className="flex flex-col gap-2 mb-6">
                  {chats.find((c) => c.id === selectedChatId)?.participants.filter(id => !chats.find((c) => c.id === selectedChatId)?.admins?.includes(id)).map((memberId) => {
                    const memberUser = users[memberId];
                    if (!memberUser) return null;
                    return (
                      <div key={memberId} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-2 text-sm shadow-sm gap-2">
                        <span className="truncate flex-1 font-bold">{memberUser.name}</span>
                        {memberId !== currentUserId && (
                          <button
                            onClick={() => handleRemoveMember(memberId)}
                            className="bg-red-500 text-white rounded-none font-bold text-[10px] px-2 py-1 hover:-translate-y-1 shadow-sm transition-transform shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-auto pt-4 border-t border-gray-200">
                  <button 
                    onClick={handleDeleteGroup}
                    className="w-full bg-red-600 text-white font-bold py-2 border border-gray-200 shadow-sm hover:-translate-y-1 transition-transform text-sm"
                  >
                    Delete Group
                  </button>
                </div>
              </div>
            )}

            <div
              ref={messageContainerRef}
              className="custom-scrollbar flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative"
            >
              {/* Texture for Chat background */}
              
              {messages.length > 0 ? (
                <div className="flex flex-col z-10 w-full">
                  <button
                    onClick={() => loadMessages(selectedChatId, true)}
                    className="mb-8 p-2 rounded-full border border-gray-200 bg-white self-center shadow-sm hover:-translate-y-1 hover:-translate-x-1 hover:shadow-sm transition-all text-xs font-bold"
                  >
                    Load Older
                  </button>
                  {messages.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis()).map((message, index, array) => {
                    const prevMessage = array[index - 1];
                    const nextMessage = array[index + 1];
                    const isConsecutiveWithPrev = prevMessage && prevMessage.senderId === message.senderId && (message.timestamp.toMillis() - prevMessage.timestamp.toMillis() < 5 * 60 * 1000);
                    const isConsecutiveWithNext = nextMessage && nextMessage.senderId === message.senderId && (nextMessage.timestamp.toMillis() - message.timestamp.toMillis() < 5 * 60 * 1000);
                    const isMyMessage = message.senderId === currentUserId;
                    const showSenderName = !isConsecutiveWithPrev && !isMyMessage && (chats.find((chat) => chat.id === selectedChatId)?.type === "community" || chats.find((chat) => chat.id === selectedChatId)?.type === "project");

                    return (
                    <div
                      key={message.id}
                      className={`flex w-full mb-${isConsecutiveWithNext ? "1" : "4"} ${
                        isMyMessage ? "justify-end" : "justify-start"
                      } ${!isConsecutiveWithPrev ? "mt-2" : ""}`}
                    >
                      {!isMyMessage && !isConsecutiveWithNext && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center text-xs font-bold shrink-0 mt-auto">
                          {(message.senderName || users[message.senderId]?.name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      {!isMyMessage && isConsecutiveWithNext && (
                        <div className="w-8 h-8 mr-2 shrink-0"></div>
                      )}
                      <div className={`flex flex-col max-w-[70%] ${isMyMessage ? "items-end" : "items-start"}`}>
                        {showSenderName && (
                          <div className="mb-1 text-xs font-bold text-gray-500 ml-1">
                            {message.senderName || users[message.senderId]?.name || "User"}
                          </div>
                        )}
                        <div
                          className={`inline-block px-4 py-2 text-sm leading-relaxed ${
                            isMyMessage
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-900 border border-gray-200"
                          } ${
                            isMyMessage 
                              ? `rounded-l-2xl rounded-tr-2xl ${isConsecutiveWithNext ? "rounded-br-sm" : "rounded-br-2xl"} ${isConsecutiveWithPrev ? "rounded-tr-sm" : ""}`
                              : `rounded-r-2xl rounded-tl-2xl ${isConsecutiveWithNext ? "rounded-bl-sm" : "rounded-bl-2xl"} ${isConsecutiveWithPrev ? "rounded-tl-sm" : ""}`
                          }`}
                        >
                          {message.content}
                        </div>
                        {!isConsecutiveWithNext && (
                          <div className={`mt-1 text-[10px] text-gray-400 ${isMyMessage ? "mr-1" : "ml-1"}`}>
                            {message.timestamp.toDate().toLocaleString([], {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center label-brutal text-gray-900/50 z-10">
                  Start your conversation
                </div>
              )}
            </div>
            <form onSubmit={sendMessage} className="border-t border-gray-200 bg-white p-4 h-[80px] shrink-0 z-10">
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
                  className="input-brutal h-full m-0 shadow-none border border-gray-200 flex-1 focus:shadow-none bg-gray-50"
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