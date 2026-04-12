"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  QueryDocumentSnapshot,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  query
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { auth } from "../../lib/firebaseConfig";
import { User } from "../../types";
import {
  AlertTriangle,
  BarChart3,
  Check,
  Database,
  Edit2,
  Eye,
  MessageCircle,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Chat {
  id: string;
  participants: string[];
  type?: "private" | "community" | "project";
  name?: string;
  admins?: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Timestamp;
  };
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Timestamp;
  encrypted?: boolean;
  encryptionVersion?: number;
  encryptionIv?: string;
  encryption?: {
    iv: string;
    algorithm?: "AES-GCM";
    version?: number;
  };
}

interface ActiveChatKeyResponse {
  activeVersion: number;
  key: string;
  versions?: Record<string, string>;
}

interface AdminUser extends User {
  role?: "admin" | "user";
  isSuspended?: boolean;
  email?: string;
  createdAt?: Timestamp;
}

type AdminPanel = "overview" | "chats" | "users" | "platform";

const CHAT_PAGE_SIZE = 40;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const deriveEncryptionKey = async (passphrase: string, chatId: string) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: textEncoder.encode(`tuples-chat-salt:${chatId}`),
      iterations: 150000,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
};

const encryptMessageContent = async (plainText: string, passphrase: string, chatId: string) => {
  const key = await deriveEncryptionKey(passphrase, chatId);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    textEncoder.encode(plainText)
  );

  return {
    cipherText: bytesToBase64(new Uint8Array(encryptedBuffer)),
    iv: bytesToBase64(iv)
  };
};

const decryptMessageContent = async (cipherText: string, iv: string, passphrase: string, chatId: string) => {
  const key = await deriveEncryptionKey(passphrase, chatId);
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(iv)
    },
    key,
    base64ToBytes(cipherText)
  );

  return textDecoder.decode(decryptedBuffer);
};

const decryptWithRawKey = async (cipherText: string, iv: string, keyBase64: string) => {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(keyBase64),
    "AES-GCM",
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(iv)
    },
    cryptoKey,
    base64ToBytes(cipherText)
  );

  return textDecoder.decode(decrypted);
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<{ [key: string]: AdminUser }>({});
  const [chats, setChats] = useState<Chat[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [latestChatMessages, setLatestChatMessages] = useState<Message[]>([]);
  const [olderChatMessages, setOlderChatMessages] = useState<Message[]>([]);
  const [chatPaginationCursor, setChatPaginationCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreChatMessages, setHasMoreChatMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [decryptedContents, setDecryptedContents] = useState<{ [msgId: string]: string }>({});
  const [decryptionErrorIds, setDecryptionErrorIds] = useState<Set<string>>(new Set());
  const [chatKeyring, setChatKeyring] = useState<{
    activeVersion: number;
    versions: Record<string, string>;
  } | null>(null);

  const [activePanel, setActivePanel] = useState<AdminPanel>("overview");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedViewerId, setSelectedViewerId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSenderId, setEditSenderId] = useState("");

  const [newMessage, setNewMessage] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [encryptionToolsEnabled, setEncryptionToolsEnabled] = useState(false);
  const [encryptNewMessages, setEncryptNewMessages] = useState(false);
  const [encryptionPassphrase, setEncryptionPassphrase] = useState("");

  const [userSearch, setUserSearch] = useState("");
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [profileInterestsDraft, setProfileInterestsDraft] = useState("");
  const [perspectiveUserId, setPerspectiveUserId] = useState("");

  const [broadcastText, setBroadcastText] = useState("");
  const [migratingAllChats, setMigratingAllChats] = useState(false);
  const [checkingEncryptionHealth, setCheckingEncryptionHealth] = useState(false);
  const [seedingAllKeys, setSeedingAllKeys] = useState(false);
  const [repairingEncryptionMetadata, setRepairingEncryptionMetadata] = useState(false);
  const [encryptionHealth, setEncryptionHealth] = useState<{
    chatsTotal: number;
    keysTotal: number;
    validKeys: number;
    missingKeys: number;
    malformedKeys: number;
    ready: boolean;
  } | null>(null);

  const startEditing = (msg: Message) => {
    setEditingMsgId(msg.id);
    setEditContent(msg.content);
    setEditSenderId(msg.senderId);
  };

  const cancelEditing = () => {
    setEditingMsgId(null);
    setEditContent("");
    setEditSenderId("");
  };

  const saveMessageEdit = async (msg: Message) => {
    if (!editSenderId || !editContent.trim()) return;

    try {
      const msgRef = doc(db, "messages", msg.id);

      if (msg.encrypted) {
        if (!encryptionToolsEnabled) {
          alert("Enable encryption tools to edit encrypted messages.");
          return;
        }

        if (!encryptionPassphrase.trim()) {
          alert("Enter encryption key to edit encrypted messages.");
          return;
        }

        const encryptedPayload = await encryptMessageContent(
          editContent,
          encryptionPassphrase.trim(),
          msg.chatId
        );

        await updateDoc(msgRef, {
          content: encryptedPayload.cipherText,
          senderId: editSenderId,
          encrypted: true,
          encryption: {
            iv: encryptedPayload.iv,
            algorithm: "AES-GCM",
            version: 1
          }
        });
      } else {
        await updateDoc(msgRef, {
          content: editContent,
          senderId: editSenderId
        });
      }

      setEditingMsgId(null);
    } catch (error) {
      console.error("Error updating message:", error);
      alert("Failed to update message. Check console for details.");
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this message?")) return;
    
    try {
      const msgRef = doc(db, "messages", msgId);
      await deleteDoc(msgRef);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message. Check console for details.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    
    // If no viewer is selected, alert the user
    if (!selectedViewerId) {
      alert("Please select a 'View As' user from the dropdown to send a message as them.");
      return;
    }

    let timestampToUse = Timestamp.now();
    if (useCustomDate && customDate) {
      timestampToUse = Timestamp.fromDate(new Date(customDate));
    }

    try {
      const shouldEncrypt =
        encryptionToolsEnabled && encryptNewMessages && Boolean(encryptionPassphrase.trim());

      let contentToStore = newMessage.trim();
      let encryptionData: Message["encryption"] | undefined;

      if (shouldEncrypt) {
        const encryptedPayload = await encryptMessageContent(
          contentToStore,
          encryptionPassphrase.trim(),
          selectedChat.id
        );
        contentToStore = encryptedPayload.cipherText;
        encryptionData = {
          iv: encryptedPayload.iv,
          algorithm: "AES-GCM",
          version: 1
        };
      }

      const messageData = {
        chatId: selectedChat.id,
        senderId: selectedViewerId,
        content: contentToStore,
        timestamp: timestampToUse,
        encrypted: shouldEncrypt,
        encryption: encryptionData || null
      };
      
      await addDoc(collection(db, "messages"), messageData);
      
      // Update last message on the chat document as well
      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: messageData
      });

      setNewMessage("");
      setCustomDate("");
      setUseCustomDate(false);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData: { [key: string]: AdminUser } = {};
      snapshot.forEach((snapshotDoc) => {
        usersData[snapshotDoc.id] = {
          ...(snapshotDoc.data() as AdminUser),
          id: snapshotDoc.id
        };
      });
      setUsers(usersData);
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "chats"), (snapshot) => {
      const chatList = snapshot.docs.map(
        (snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }) as Chat
      );

      chatList.sort((a, b) => {
        const tA = a.lastMessage?.timestamp?.toMillis?.() || 0;
        const tB = b.lastMessage?.timestamp?.toMillis?.() || 0;
        return tB - tA;
      });

      setChats(chatList);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "messages"), (snapshot) => {
      const mappedMessages = snapshot.docs.map(
        (snapshotDoc) => ({ ...snapshotDoc.data(), id: snapshotDoc.id }) as Message
      );
      setAllMessages(mappedMessages);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSelectedViewerId(null);
    setEditingMsgId(null);
    setLatestChatMessages([]);
    setOlderChatMessages([]);
    setChatPaginationCursor(null);
    setHasMoreChatMessages(false);
    setDecryptedContents({});
    setDecryptionErrorIds(new Set());
    setChatKeyring(null);
  }, [selectedChat?.id]);

  useEffect(() => {
    if (!selectedChat) return;

    let cancelled = false;

    const loadChatKeyring = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch(
          `/api/chat/encryption/key?chatId=${encodeURIComponent(selectedChat.id)}&includeHistory=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          console.warn("Admin keyring fetch failed:", payload?.error || payload?.details || response.status);
          if (!cancelled) setChatKeyring(null);
          return;
        }

        const payload = (await response.json()) as ActiveChatKeyResponse;
        const versions = payload.versions || { [String(payload.activeVersion)]: payload.key };

        if (!cancelled) {
          setChatKeyring({
            activeVersion: payload.activeVersion,
            versions
          });
        }
      } catch (error) {
        console.error("Failed to load chat keyring for admin page:", error);
        if (!cancelled) setChatKeyring(null);
      }
    };

    loadChatKeyring();

    return () => {
      cancelled = true;
    };
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat) return;

    const initialQuery = query(
      collection(db, "messages"),
      where("chatId", "==", selectedChat.id),
      orderBy("timestamp", "desc"),
      limit(CHAT_PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(initialQuery, (snapshot) => {
      const mappedMessages = snapshot.docs.map(
        (snapshotDoc) => ({ ...snapshotDoc.data(), id: snapshotDoc.id }) as Message
      );

      setLatestChatMessages(mappedMessages);
      setChatPaginationCursor(snapshot.docs.at(-1) || null);
      setHasMoreChatMessages(snapshot.docs.length === CHAT_PAGE_SIZE);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedUserId || !users[selectedUserId]) return;
    const pickedUser = users[selectedUserId];
    setProfileNameDraft(pickedUser.name || "");
    setProfileInterestsDraft((pickedUser.interests || []).join(", "));
  }, [selectedUserId, users]);

  const selectedChatMessages = useMemo(() => {
    const byId = new Map<string, Message>();

    [...latestChatMessages, ...olderChatMessages].forEach((message) => {
      byId.set(message.id, message);
    });

    return Array.from(byId.values()).sort((a, b) => {
      const timeA = a.timestamp?.toMillis?.() || 0;
      const timeB = b.timestamp?.toMillis?.() || 0;
      return timeA - timeB;
    });
  }, [latestChatMessages, olderChatMessages]);

  useEffect(() => {
    const encryptedMessages = selectedChatMessages.filter((msg) => msg.encrypted && msg.encryption?.iv);
    if (!selectedChatMessages.length || !selectedChat) {
      return;
    }

    let cancelled = false;

    const decryptAll = async () => {
      const nextMap: { [msgId: string]: string } = {};
      const failedIds = new Set<string>();

      await Promise.all(
        selectedChatMessages.map(async (msg) => {
          if (!msg.encrypted) {
            nextMap[msg.id] = msg.content;
            return;
          }

          const messageIv = msg.encryptionIv || msg.encryption?.iv;
          const messageVersion = msg.encryptionVersion ?? msg.encryption?.version ?? chatKeyring?.activeVersion;
          const versionKey = messageVersion ? String(messageVersion) : "";
          const rawKey = versionKey ? chatKeyring?.versions?.[versionKey] : undefined;

          if (messageIv && rawKey) {
            try {
              const plainText = await decryptWithRawKey(msg.content, messageIv, rawKey);
              nextMap[msg.id] = plainText;
              return;
            } catch {
              // Fallback to legacy passphrase decryption below if available.
            }
          }

          if (msg.encryption?.iv && encryptionPassphrase.trim()) {
            try {
              const plainText = await decryptMessageContent(
                msg.content,
                msg.encryption.iv,
                encryptionPassphrase.trim(),
                selectedChat.id
              );
              nextMap[msg.id] = plainText;
              return;
            } catch {
              // Mark as failed below.
            }
          }

          failedIds.add(msg.id);
        })
      );

      if (!cancelled) {
        setDecryptedContents(nextMap);
        setDecryptionErrorIds(failedIds);
      }
    };

    decryptAll();

    return () => {
      cancelled = true;
    };
  }, [selectedChatMessages, selectedChat, chatKeyring, encryptionPassphrase]);

  const loadOlderMessages = async () => {
    if (!selectedChat || !chatPaginationCursor || loadingMoreMessages || !hasMoreChatMessages) return;

    setLoadingMoreMessages(true);
    try {
      const olderQuery = query(
        collection(db, "messages"),
        where("chatId", "==", selectedChat.id),
        orderBy("timestamp", "desc"),
        startAfter(chatPaginationCursor),
        limit(CHAT_PAGE_SIZE)
      );

      const olderSnapshot = await getDocs(olderQuery);
      const olderBatch = olderSnapshot.docs.map(
        (snapshotDoc) => ({ ...snapshotDoc.data(), id: snapshotDoc.id }) as Message
      );

      setOlderChatMessages((prev) => {
        const byId = new Map(prev.map((item) => [item.id, item]));
        olderBatch.forEach((item) => byId.set(item.id, item));
        return Array.from(byId.values());
      });

      setChatPaginationCursor(olderSnapshot.docs.at(-1) || null);
      setHasMoreChatMessages(olderSnapshot.docs.length === CHAT_PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load older messages:", error);
      alert("Unable to load older messages.");
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  const getMessageDisplayText = (msg: Message) => {
    if (!msg.encrypted) return msg.content;
    if (decryptedContents[msg.id]) return decryptedContents[msg.id];
    if (decryptionErrorIds.has(msg.id)) return "[Encrypted message]";
    return "[Encrypted message]";
  };

  const filteredUsers = useMemo(() => {
    const queryText = userSearch.trim().toLowerCase();
    const userEntries = Object.entries(users);
    if (!queryText) return userEntries;
    return userEntries.filter(([userId, user]) => {
      const haystack = `${userId} ${user.name || ""} ${(user.interests || []).join(" ")} ${user.role || ""}`.toLowerCase();
      return haystack.includes(queryText);
    });
  }, [userSearch, users]);

  const selectedUser = selectedUserId ? users[selectedUserId] : null;

  const selectedUserFriends = useMemo(() => {
    if (!selectedUser?.friends?.length) return [];

    return selectedUser.friends
      .map((friendId) => (typeof friendId === "string" ? friendId.trim() : ""))
      .filter(Boolean)
      .map((friendId) => ({
        id: friendId,
        profile: users[friendId]
      }));
  }, [selectedUser, users]);

  const overview = useMemo(() => {
    const suspendedUsers = Object.values(users).filter((user) => user.isSuspended).length;
    const adminUsers = Object.values(users).filter((user) => user.role === "admin").length;
    const communityChats = chats.filter((chat) => chat.type === "community").length;
    const projectChats = chats.filter((chat) => chat.type === "project").length;
    const privateChats = chats.filter((chat) => !chat.type || chat.type === "private").length;

    const flaggedMessageCount = allMessages.filter((msg) =>
      /spam|scam|hate|abuse|suicide|attack|kill|threat/i.test(msg.content)
    ).length;

    return {
      totalUsers: Object.keys(users).length,
      totalChats: chats.length,
      totalMessages: allMessages.length,
      suspendedUsers,
      adminUsers,
      communityChats,
      projectChats,
      privateChats,
      flaggedMessageCount
    };
  }, [allMessages, chats, users]);

  const getUserChatCount = (userId: string) => chats.filter((chat) => chat.participants.includes(userId)).length;

  const formatTimestamp = (timestamp?: Timestamp) => {
    if (!timestamp?.toDate) return "No timestamp";
    return timestamp.toDate().toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;
    return (
      chat.participants.map((id) => users[id]?.name || "Unknown").join(", ") ||
      "Unnamed Chat"
    );
  };

  const saveUserProfile = async () => {
    if (!selectedUserId) return;
    const cleanName = profileNameDraft.trim();
    const cleanInterests = profileInterestsDraft
      .split(",")
      .map((interest) => interest.trim())
      .filter(Boolean);

    if (!cleanName) {
      alert("Name cannot be empty.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", selectedUserId), {
        name: cleanName,
        interests: cleanInterests
      });
      alert("User profile updated.");
    } catch (error) {
      console.error("Error updating user profile:", error);
      alert("Failed to update profile.");
    }
  };

  const toggleUserSuspension = async (userId: string, currentState?: boolean) => {
    const nextState = !currentState;
    const confirmed = window.confirm(
      nextState ? "Suspend this user account?" : "Remove suspension from this user?"
    );
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "users", userId), {
        isSuspended: nextState
      });
    } catch (error) {
      console.error("Error toggling suspension:", error);
      alert("Could not update user suspension status.");
    }
  };

  const toggleUserRole = async (userId: string, currentRole?: "admin" | "user") => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    const confirmed = window.confirm(`Set role to ${nextRole.toUpperCase()}?`);
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "users", userId), {
        role: nextRole
      });
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Could not update user role.");
    }
  };

  const deleteUserProfile = async (userId: string) => {
    const text = window.prompt("Type DELETE to confirm removal of this user document.");
    if (text !== "DELETE") return;

    try {
      await deleteDoc(doc(db, "users", userId));
      if (selectedUserId === userId) {
        setSelectedUserId(null);
      }
      alert("User document deleted. Auth account deletion must be done server-side.");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user.");
    }
  };

  const purgeSelectedChat = async () => {
    if (!selectedChat) return;

    const confirmed = window.confirm(
      "Delete the selected chat and all messages in it? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      const chatMessagesQuery = query(collection(db, "messages"), where("chatId", "==", selectedChat.id));
      const snapshot = await getDocs(chatMessagesQuery);

      const batches: ReturnType<typeof writeBatch>[] = [];
      let currentBatch = writeBatch(db);
      let counter = 0;

      snapshot.docs.forEach((snapshotDoc) => {
        currentBatch.delete(snapshotDoc.ref);
        counter += 1;

        if (counter === 450) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          counter = 0;
        }
      });

      if (counter > 0) batches.push(currentBatch);

      for (const batch of batches) {
        await batch.commit();
      }

      await deleteDoc(doc(db, "chats", selectedChat.id));
      setSelectedChat(null);
    } catch (error) {
      console.error("Error purging chat:", error);
      alert("Failed to purge chat.");
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastText.trim()) return;

    try {
      await addDoc(collection(db, "adminBroadcasts"), {
        message: broadcastText.trim(),
        createdAt: Timestamp.now(),
        createdBy: "admin-panel"
      });
      setBroadcastText("");
      alert("Broadcast published to adminBroadcasts collection.");
    } catch (error) {
      console.error("Broadcast error:", error);
      alert("Failed to publish broadcast.");
    }
  };

  const cleanupOrphanMessages = async () => {
    const knownChatIds = new Set(chats.map((chat) => chat.id));
    const orphanMessages = allMessages.filter((message) => !knownChatIds.has(message.chatId));

    if (!orphanMessages.length) {
      alert("No orphan messages found.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${orphanMessages.length} orphan messages that no longer belong to an existing chat?`
    );
    if (!confirmed) return;

    try {
      const batches: ReturnType<typeof writeBatch>[] = [];
      let currentBatch = writeBatch(db);
      let counter = 0;

      orphanMessages.forEach((message) => {
        currentBatch.delete(doc(db, "messages", message.id));
        counter += 1;

        if (counter === 450) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          counter = 0;
        }
      });

      if (counter > 0) batches.push(currentBatch);

      for (const batch of batches) {
        await batch.commit();
      }

      alert("Orphan message cleanup completed.");
    } catch (error) {
      console.error("Error cleaning orphan messages:", error);
      alert("Failed to clean orphan messages.");
    }
  };

  const checkEncryptionHealth = async () => {
    try {
      setCheckingEncryptionHealth(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("You must be signed in as admin.");
        return;
      }

      const response = await fetch("/api/chat/encryption/health", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        alert(payload?.error || "Failed to check encryption health.");
        return;
      }

      setEncryptionHealth(payload);
    } catch (error) {
      console.error("Error checking encryption health:", error);
      alert("Failed to check encryption health.");
    } finally {
      setCheckingEncryptionHealth(false);
    }
  };

  const seedAllChatKeys = async () => {
    try {
      setSeedingAllKeys(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("You must be signed in as admin.");
        return;
      }

      const response = await fetch("/api/chat/encryption/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: "seedAll" })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        alert(payload?.error || "Failed to seed keys.");
        return;
      }

      alert(`Seeded ${payload?.createdCount || 0} missing chat key documents.`);
      await checkEncryptionHealth();
    } catch (error) {
      console.error("Error seeding chat keys:", error);
      alert("Failed to seed chat keys.");
    } finally {
      setSeedingAllKeys(false);
    }
  };

  const migrateAllChatEncryption = async () => {
    const confirmed = window.confirm(
      "Seed encryption keys for every chat and encrypt all existing plaintext messages across the platform?"
    );
    if (!confirmed) return;

    try {
      setMigratingAllChats(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("You must be signed in as an admin to run this action.");
        return;
      }

      // Step 1: Seed all missing keys
      console.log("Step 1: Seeding all missing encryption keys...");
      try {
        const seedResponse = await fetch("/api/chat/encryption/migrate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ action: "seedAll" })
        });

        if (!seedResponse.ok) {
          const seedError = await seedResponse.json().catch(() => null);
          console.error("Seed-all failed:", seedError);
          alert(`Seed all failed: ${seedError?.error || "Unknown error"}. Check console.`);
          return;
        }

        const seedData = await seedResponse.json();
        console.log("Seed all completed:", seedData);
      } catch (seedErr) {
        console.error("Seed-all request failed:", seedErr);
        alert(`Seed all request failed: ${String(seedErr)}. Check console.`);
        return;
      }

      // Step 2: Encrypt all plaintext messages
      console.log("Step 2: Encrypting all plaintext messages...");
      try {
        const encryptResponse = await fetch("/api/chat/encryption/migrate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ action: "encryptAllExisting" })
        });

        if (!encryptResponse.ok) {
          const encryptError = await encryptResponse.json().catch(() => null);
          console.error("Encrypt-all failed:", encryptError);
          alert(`Encrypt all failed: ${encryptError?.error || "Unknown error"}. Check console.`);
          return;
        }

        const encryptData = await encryptResponse.json();
        console.log("Encrypt all completed:", encryptData);
        alert(
          `✅ Migration complete!\n\n` +
          `Seeded keys: ${encryptData.createdCount || 0}\n` +
          `Encrypted messages: ${encryptData.updatedCount || 0}`
        );
      } catch (encryptErr) {
        console.error("Encrypt-all request failed:", encryptErr);
        alert(`Encrypt all request failed: ${String(encryptErr)}. Check console.`);
      }
    } finally {
      setMigratingAllChats(false);
    }
  };

  const repairEncryptionMetadata = async () => {
    const confirmed = window.confirm(
      "Repair legacy encryption metadata across all encrypted messages? This only normalizes metadata fields; it does not re-encrypt content."
    );
    if (!confirmed) return;

    try {
      setRepairingEncryptionMetadata(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("You must be signed in as admin.");
        return;
      }

      const response = await fetch("/api/chat/encryption/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: "repairMetadata" })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        alert(payload?.error || "Failed to repair encryption metadata.");
        return;
      }

      alert(
        `Metadata repair complete. Repaired: ${payload?.repairedCount || 0}, ` +
          `Skipped (missing IV): ${payload?.skippedCount || 0}, ` +
          `Total encrypted scanned: ${payload?.totalEncrypted || 0}.`
      );
    } catch (error) {
      console.error("Error repairing encryption metadata:", error);
      alert("Failed to repair encryption metadata.");
    } finally {
      setRepairingEncryptionMetadata(false);
    }
  };

  const baseCardClass =
    "rounded-2xl border border-white/40 bg-white/70 backdrop-blur-md shadow-[0_10px_30px_rgba(10,37,64,0.08)]";

  const openUserPerspective = () => {
    const targetUserId = perspectiveUserId.trim();
    if (!targetUserId) {
      alert("Select a user to preview their app perspective.");
      return;
    }

    router.push(`/home?viewAs=${encodeURIComponent(targetUserId)}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ecfeff,_#e0e7ff_40%,_#f8fafc_80%)] text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/60 bg-gradient-to-r from-slate-900 via-indigo-900 to-cyan-900 p-6 text-white shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/15 p-2">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Tuples Control Core</h1>
                <p className="text-sm text-white/80">Full-stack moderation, user control, and platform diagnostics.</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/80">
              Live Admin Session
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-white/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">View App As User</p>
            <select
              className="min-w-[220px] rounded-lg border border-white/30 bg-black/20 px-2 py-1 text-xs text-white outline-none"
              value={perspectiveUserId}
              onChange={(e) => setPerspectiveUserId(e.target.value)}
            >
              <option value="">Select user</option>
              {Object.entries(users).map(([userId, user]) => (
                <option key={userId} value={userId}>
                  {user.name || "Unnamed"} ({userId})
                </option>
              ))}
            </select>
            <button
              onClick={openUserPerspective}
              className="rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/30"
            >
              Open Perspective
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">
              <p className="text-xs uppercase text-white/70">Users</p>
              <p className="text-xl font-bold">{overview.totalUsers}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">
              <p className="text-xs uppercase text-white/70">Chats</p>
              <p className="text-xl font-bold">{overview.totalChats}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">
              <p className="text-xs uppercase text-white/70">Messages</p>
              <p className="text-xl font-bold">{overview.totalMessages}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">
              <p className="text-xs uppercase text-white/70">Flagged Keywords</p>
              <p className="text-xl font-bold">{overview.flaggedMessageCount}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className={`${baseCardClass} h-fit p-3`}>
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Control Panels</p>
            <div className="space-y-2">
              <button
                onClick={() => setActivePanel("overview")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  activePanel === "overview" ? "bg-slate-900 text-white" : "bg-white/60 text-slate-700 hover:bg-white"
                }`}
              >
                <BarChart3 className="h-4 w-4" /> Overview
              </button>
              <button
                onClick={() => setActivePanel("chats")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  activePanel === "chats" ? "bg-slate-900 text-white" : "bg-white/60 text-slate-700 hover:bg-white"
                }`}
              >
                <MessageCircle className="h-4 w-4" /> Chat Moderation
              </button>
              <button
                onClick={() => setActivePanel("users")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  activePanel === "users" ? "bg-slate-900 text-white" : "bg-white/60 text-slate-700 hover:bg-white"
                }`}
              >
                <UserCog className="h-4 w-4" /> User Management
              </button>
              <button
                onClick={() => setActivePanel("platform")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  activePanel === "platform" ? "bg-slate-900 text-white" : "bg-white/60 text-slate-700 hover:bg-white"
                }`}
              >
                <Settings2 className="h-4 w-4" /> Platform Controls
              </button>
            </div>
          </aside>

          <main className="min-w-0">
            {activePanel === "overview" && (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className={`${baseCardClass} p-5`}>
                  <h2 className="mb-4 text-lg font-black tracking-tight">Platform Snapshot</h2>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-900 p-3 text-white">
                      <p className="text-white/70">Suspended Users</p>
                      <p className="text-2xl font-bold">{overview.suspendedUsers}</p>
                    </div>
                    <div className="rounded-xl bg-cyan-600 p-3 text-white">
                      <p className="text-white/70">Admin Users</p>
                      <p className="text-2xl font-bold">{overview.adminUsers}</p>
                    </div>
                    <div className="rounded-xl bg-indigo-600 p-3 text-white">
                      <p className="text-white/70">Community Chats</p>
                      <p className="text-2xl font-bold">{overview.communityChats}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-600 p-3 text-white">
                      <p className="text-white/70">Project Chats</p>
                      <p className="text-2xl font-bold">{overview.projectChats}</p>
                    </div>
                  </div>
                </div>

                <div className={`${baseCardClass} p-5`}>
                  <h2 className="mb-4 text-lg font-black tracking-tight">Risk Radar</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <span className="font-medium text-amber-900">Flagged Messages</span>
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 font-bold text-amber-900">{overview.flaggedMessageCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="font-medium text-slate-800">Private Chats</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 font-bold text-slate-900">{overview.privateChats}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                      <span className="font-medium text-indigo-900">Live Sources</span>
                      <span className="rounded-full bg-indigo-200 px-2 py-0.5 font-bold text-indigo-900">
                        {[loadingUsers, loadingChats, loadingMessages].some(Boolean) ? "Syncing" : "Healthy"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activePanel === "chats" && (
              <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div className={`${baseCardClass} max-h-[78vh] overflow-hidden`}>
                  <div className="border-b border-slate-200/70 px-4 py-3">
                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">All Chats</h2>
                    <p className="text-xs text-slate-500">Pick a conversation to moderate.</p>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto">
                    {loadingChats ? (
                      <div className="p-4 text-sm text-slate-500">Loading chats...</div>
                    ) : chats.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500">No chats available.</div>
                    ) : (
                      chats.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => setSelectedChat(chat)}
                          className={`w-full border-b border-slate-100 px-4 py-3 text-left transition ${
                            selectedChat?.id === chat.id ? "bg-indigo-50" : "hover:bg-white"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                              {chat.type === "community" || chat.type === "project" ? (
                                <Users className="h-4 w-4" />
                              ) : (
                                <MessageCircle className="h-4 w-4" />
                              )}
                            </div>
                            <p className="truncate text-sm font-bold text-slate-800">{getChatName(chat)}</p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {(chat.type || "private").toUpperCase()} · {chat.participants.length} users
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className={`${baseCardClass} flex min-h-[78vh] flex-col overflow-hidden`}>
                  {selectedChat ? (
                    <>
                      <div className="border-b border-slate-200/80 bg-white/80 px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-black tracking-tight text-slate-800">{getChatName(selectedChat)}</h3>
                            <p className="text-xs text-slate-500">ID: {selectedChat.id} · Type: {selectedChat.type || "private"}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                              <Eye className="h-3.5 w-3.5 text-indigo-600" />
                              <span className="font-semibold text-slate-700">View as</span>
                              <select
                                className="bg-transparent font-semibold text-slate-900 outline-none"
                                value={selectedViewerId || ""}
                                onChange={(e) => setSelectedViewerId(e.target.value || null)}
                              >
                                <option value="">Neutral</option>
                                {selectedChat.participants.map((pid) => (
                                  <option key={pid} value={pid}>
                                    {users[pid]?.name || "Unknown"}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => setEncryptionToolsEnabled((current) => !current)}
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                                encryptionToolsEnabled
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                  : "border-slate-300 bg-slate-100 text-slate-700"
                              }`}
                              title="Enable only when you need to decrypt or send encrypted content"
                            >
                              {encryptionToolsEnabled ? "Encryption Tools: ON" : "Encryption Tools: OFF"}
                            </button>
                            {encryptionToolsEnabled && (
                              <>
                                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={encryptNewMessages}
                                    onChange={(e) => setEncryptNewMessages(e.target.checked)}
                                  />
                                  Encrypt Send
                                </label>
                                <input
                                  type="password"
                                  value={encryptionPassphrase}
                                  onChange={(e) => setEncryptionPassphrase(e.target.value)}
                                  placeholder="Encryption key"
                                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500"
                                />
                              </>
                            )}
                            <button
                              onClick={purgeSelectedChat}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                            >
                              Purge Chat
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 space-y-5 overflow-y-auto bg-gradient-to-b from-slate-50/50 to-white p-5">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={loadOlderMessages}
                            disabled={!hasMoreChatMessages || loadingMoreMessages}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {loadingMoreMessages ? "Loading..." : hasMoreChatMessages ? "Load Older Messages" : "No Older Messages"}
                          </button>
                          <span className="text-xs text-slate-500">{selectedChatMessages.length} loaded</span>
                        </div>

                        {selectedChatMessages.length === 0 ? (
                          <div className="mx-auto w-fit rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                            No messages yet.
                          </div>
                        ) : (
                          selectedChatMessages.map((msg) => {
                            const senderName = users[msg.senderId]?.name || "Unknown User";
                            const isViewer = selectedViewerId === msg.senderId;

                            return (
                              <div key={msg.id} className={`flex flex-col ${isViewer ? "items-end" : "items-start"}`}>
                                <div className={`mb-1 flex items-center gap-2 px-1 ${isViewer ? "flex-row-reverse" : ""}`}>
                                  <span className="text-xs font-bold text-slate-700">{senderName}</span>
                                  <span className="text-[11px] text-slate-400">{formatTimestamp(msg.timestamp)}</span>
                                </div>

                                {editingMsgId === msg.id ? (
                                  <div className="w-full max-w-[80%] rounded-xl border border-amber-200 bg-amber-50 p-3">
                                    <div className="mb-2">
                                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-amber-900">
                                        Sender
                                      </label>
                                      <select
                                        value={editSenderId}
                                        onChange={(e) => setEditSenderId(e.target.value)}
                                        className="w-full rounded-lg border border-amber-300 bg-white p-2 text-sm"
                                      >
                                        <option value={msg.senderId}>{users[msg.senderId]?.name || "Original Sender"}</option>
                                        {selectedChat.participants
                                          .filter((participantId) => participantId !== msg.senderId)
                                          .map((participantId) => (
                                            <option key={participantId} value={participantId}>
                                              {users[participantId]?.name || "Unknown"}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-amber-900">
                                        Content
                                      </label>
                                      <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        rows={3}
                                        className="w-full resize-none rounded-lg border border-amber-300 bg-white p-2 text-sm"
                                      />
                                    </div>
                                    <div className="mt-3 flex justify-end gap-2">
                                      <button
                                        onClick={cancelEditing}
                                        className="flex items-center gap-1 rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                                      >
                                        <X className="h-3 w-3" /> Cancel
                                      </button>
                                      <button
                                        onClick={() => saveMessageEdit(msg)}
                                        className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                                      >
                                        <Check className="h-3 w-3" /> Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="group relative">
                                    <div
                                      className={`max-w-[80vw] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm sm:max-w-[60vw] ${
                                        isViewer
                                          ? "rounded-tr-sm bg-indigo-600 text-white"
                                          : "rounded-tl-sm border border-slate-200 bg-white text-slate-800"
                                      }`}
                                    >
                                      {getMessageDisplayText(msg)}
                                      {msg.encrypted && (
                                        <div className={`mt-1 text-[10px] font-semibold ${isViewer ? "text-white/70" : "text-indigo-600"}`}>
                                          ENCRYPTED
                                        </div>
                                      )}
                                    </div>
                                    <div
                                      className={`absolute top-0 flex gap-1 opacity-0 transition group-hover:opacity-100 ${
                                        isViewer ? "right-full mr-2" : "left-full ml-2"
                                      }`}
                                    >
                                      <button
                                        onClick={() => {
                                          if (msg.encrypted && !encryptionToolsEnabled) {
                                            alert("Enable encryption tools to edit encrypted messages.");
                                            return;
                                          }
                                          if (msg.encrypted && !decryptedContents[msg.id]) {
                                            alert("Provide a valid encryption key before editing encrypted messages.");
                                            return;
                                          }
                                          startEditing({ ...msg, content: getMessageDisplayText(msg) });
                                        }}
                                        className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm hover:text-indigo-600"
                                        title="Edit Message"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => deleteMessage(msg.id)}
                                        className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm hover:text-red-600"
                                        title="Delete Message"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="border-t border-slate-200 bg-white/90 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <label className="flex items-center gap-2 font-semibold">
                            <input
                              type="checkbox"
                              checked={useCustomDate}
                              onChange={(e) => setUseCustomDate(e.target.checked)}
                            />
                            Set custom timestamp
                          </label>
                          {useCustomDate && (
                            <input
                              type="datetime-local"
                              value={customDate}
                              onChange={(e) => setCustomDate(e.target.value)}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1"
                            />
                          )}
                        </div>

                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={
                              selectedViewerId
                                ? `Chatting as: ${users[selectedViewerId]?.name || "Selected User"}`
                                : "Choose a user in View as to send a message"
                            }
                            disabled={!selectedViewerId}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <button
                            type="submit"
                            disabled={!selectedViewerId || !newMessage.trim()}
                            className="rounded-full bg-indigo-600 p-2.5 text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Send className="h-4.5 w-4.5" />
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-slate-500">
                      <ShieldAlert className="h-12 w-12 text-slate-300" />
                      <h3 className="text-lg font-black text-slate-700">Select a chat to moderate</h3>
                      <p className="text-sm">Message editing, sender spoofing, and purge tools are available after selecting one.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activePanel === "users" && (
              <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div className={`${baseCardClass} max-h-[78vh] overflow-hidden`}>
                  <div className="border-b border-slate-200/70 p-4">
                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Users</h2>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by id, name, interest"
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="max-h-[67vh] overflow-y-auto">
                    {loadingUsers ? (
                      <div className="p-4 text-sm text-slate-500">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500">No matching users.</div>
                    ) : (
                      filteredUsers.map(([userId, user]) => (
                        <button
                          key={userId}
                          onClick={() => setSelectedUserId(userId)}
                          className={`w-full border-b border-slate-100 px-4 py-3 text-left transition ${
                            selectedUserId === userId ? "bg-indigo-50" : "hover:bg-white"
                          }`}
                        >
                          <p className="truncate text-sm font-bold text-slate-800">{user.name || "Unnamed User"}</p>
                          <p className="truncate text-xs text-slate-500">{userId}</p>
                          <div className="mt-1 flex gap-1">
                            {user.role === "admin" && (
                              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">ADMIN</span>
                            )}
                            {user.isSuspended && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">SUSPENDED</span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className={`${baseCardClass} p-5`}>
                  {selectedUser && selectedUserId ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black tracking-tight text-slate-800">{selectedUser.name || "Unnamed User"}</h3>
                          <p className="break-all text-xs text-slate-500">{selectedUserId}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleUserRole(selectedUserId, selectedUser.role)}
                            className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800"
                          >
                            {selectedUser.role === "admin" ? "Revoke Admin" : "Make Admin"}
                          </button>
                          <button
                            onClick={() => toggleUserSuspension(selectedUserId, selectedUser.isSuspended)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                              selectedUser.isSuspended
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border border-amber-200 bg-amber-50 text-amber-800"
                            }`}
                          >
                            {selectedUser.isSuspended ? "Unsuspend" : "Suspend"}
                          </button>
                          <button
                            onClick={() => deleteUserProfile(selectedUserId)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"
                          >
                            Delete Doc
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-900 p-3 text-white">
                          <p className="text-xs text-white/70">Chats Joined</p>
                          <p className="text-2xl font-bold">{getUserChatCount(selectedUserId)}</p>
                        </div>
                        <div className="rounded-xl bg-indigo-600 p-3 text-white">
                          <p className="text-xs text-white/70">Friends</p>
                          <p className="text-2xl font-bold">{selectedUserFriends.length}</p>
                        </div>
                        <div className="rounded-xl bg-cyan-600 p-3 text-white">
                          <p className="text-xs text-white/70">Interests</p>
                          <p className="text-2xl font-bold">{selectedUser.interests?.length || 0}</p>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Display Name</label>
                          <input
                            type="text"
                            value={profileNameDraft}
                            onChange={(e) => setProfileNameDraft(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Interests (comma separated)</label>
                          <textarea
                            rows={3}
                            value={profileInterestsDraft}
                            onChange={(e) => setProfileInterestsDraft(e.target.value)}
                            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={saveUserProfile}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                          >
                            Save Profile Changes
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h4 className="text-sm font-black uppercase tracking-wide text-slate-700">See Friends</h4>
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                            {selectedUserFriends.length}
                          </span>
                        </div>

                        {selectedUserFriends.length === 0 ? (
                          <p className="text-sm text-slate-500">This user has no friends added.</p>
                        ) : (
                          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                           
                            {selectedUserFriends.map((friend) => (
                              <div
                                key={friend.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-800">
                                    {friend.id || "Unknown User"}
                                  </p>
                                  
                                </div>
                                <button
                                  onClick={() => setSelectedUserId(friend.id)}
                                  className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700"
                                  disabled={!users[friend.id]}
                                >
                                  Open
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[60vh] items-center justify-center text-center text-slate-500">
                      Select a user from the left to manage role, suspension, and profile data.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activePanel === "platform" && (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className={`${baseCardClass} p-5`}>
                  <div className="mb-3 flex items-center gap-2">
                    <Database className="h-5 w-5 text-slate-700" />
                    <h2 className="text-lg font-black tracking-tight">System Maintenance</h2>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                      Remove dangling messages that point to deleted chats and keep your message collection clean.
                    </div>
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-slate-700">
                      Seed encryption keys for every chat and convert every plaintext message into encrypted form.
                    </div>
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-slate-700">
                      <p className="font-bold text-cyan-900">Encryption Health</p>
                      {encryptionHealth ? (
                        <p className="mt-1 text-xs text-cyan-900">
                          Chats: {encryptionHealth.chatsTotal} | Valid Keys: {encryptionHealth.validKeys} | Missing: {encryptionHealth.missingKeys} | Malformed: {encryptionHealth.malformedKeys}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-cyan-900">Run health check to inspect key readiness.</p>
                      )}
                    </div>
                    <button
                      onClick={checkEncryptionHealth}
                      disabled={checkingEncryptionHealth}
                      className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 font-bold text-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {checkingEncryptionHealth ? "Checking..." : "Check Encryption Health"}
                    </button>
                    <button
                      onClick={seedAllChatKeys}
                      disabled={seedingAllKeys}
                      className="rounded-lg border border-cyan-300 bg-cyan-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {seedingAllKeys ? "Seeding Keys..." : "Seed Missing Chat Keys"}
                    </button>
                    <button
                      onClick={cleanupOrphanMessages}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 font-bold text-indigo-800"
                    >
                      Cleanup Orphan Messages
                    </button>
                    <button
                      onClick={migrateAllChatEncryption}
                      disabled={migratingAllChats}
                      className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {migratingAllChats ? "Encrypting All Chats..." : "Encrypt All Existing Chats"}
                    </button>
                    <button
                      onClick={repairEncryptionMetadata}
                      disabled={repairingEncryptionMetadata}
                      className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-2 font-bold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {repairingEncryptionMetadata ? "Repairing Metadata..." : "Repair Encryption Metadata"}
                    </button>
                  </div>
                </div>

                <div className={`${baseCardClass} p-5`}>
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-700" />
                    <h2 className="text-lg font-black tracking-tight">Admin Broadcast</h2>
                  </div>
                  <p className="mb-3 text-sm text-slate-600">
                    Publish high-priority platform notices to the <span className="font-bold">adminBroadcasts</span> collection.
                  </p>
                  <textarea
                    rows={4}
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="Example: Scheduled maintenance tonight at 11:30 PM IST."
                    className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={sendBroadcast}
                      disabled={!broadcastText.trim()}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Publish Broadcast
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}