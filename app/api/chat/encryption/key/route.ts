import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createCipheriv } from "crypto";
import { adminAuth, adminDb } from "@/app/lib/firebaseAdmin";

type KeyDoc = {
  activeVersion: number;
  versions: Record<string, string>;
  updatedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

const jsonError = (message: string, status = 400) => {
  return NextResponse.json({ error: message }, { status });
};

const getBearerToken = (request: NextRequest) => {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
};

const encryptWithRawKey = (plainText: string, keyBase64: string) => {
  const key = Uint8Array.from(Buffer.from(keyBase64, "base64"));
  const iv = Uint8Array.from(randomBytes(12));
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encryptedPart = Uint8Array.from(cipher.update(plainText, "utf8"));
  const finalPart = Uint8Array.from(cipher.final());
  const tag = Uint8Array.from(cipher.getAuthTag());

  const merged = new Uint8Array(encryptedPart.length + finalPart.length + tag.length);
  merged.set(encryptedPart, 0);
  merged.set(finalPart, encryptedPart.length);
  merged.set(tag, encryptedPart.length + finalPart.length);

  return {
    cipherText: Buffer.from(merged).toString("base64"),
    iv: Buffer.from(iv).toString("base64")
  };
};

const isChatAdmin = (chatData: any, uid: string) => {
  const ownerId = Array.isArray(chatData?.participants) ? chatData.participants[0] : null;
  const admins = Array.isArray(chatData?.admins) ? chatData.admins : [];
  return ownerId === uid || admins.includes(uid);
};

const isPlatformAdmin = async (uid: string) => {
  const userSnapshot = await adminDb().collection("users").doc(uid).get();
  return userSnapshot.exists && userSnapshot.data()?.role === "admin";
};

const assertParticipantAndGetContext = async (request: NextRequest, chatId: string) => {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }

  const decoded = await adminAuth().verifyIdToken(token);
  const uid = decoded.uid;

  const chatRef = adminDb().collection("chats").doc(chatId);
  const chatSnapshot = await chatRef.get();

  if (!chatSnapshot.exists) {
    throw new Error("CHAT_NOT_FOUND");
  }

  const chatData = chatSnapshot.data() || {};
  const participants = Array.isArray(chatData.participants) ? chatData.participants : [];
  const platformAdmin = await isPlatformAdmin(uid);

  if (!participants.includes(uid) && !platformAdmin) {
    throw new Error("FORBIDDEN");
  }

  return {
    uid,
    chatData,
    isAdmin: platformAdmin || isChatAdmin(chatData, uid),
    chatRef
  };
};

const ensureKeyDoc = async (chatId: string) => {
  const keyRef = adminDb().collection("chatEncryptionKeys").doc(chatId);
  const keySnapshot = await keyRef.get();

  if (keySnapshot.exists) {
    return { keyRef, data: keySnapshot.data() as KeyDoc };
  }

  const initialData: KeyDoc = {
    activeVersion: 1,
    versions: { "1": randomBytes(32).toString("base64") },
    updatedAt: new Date() as any
  };

  await keyRef.set(initialData);
  return { keyRef, data: initialData };
};

export async function GET(request: NextRequest) {
  try {
    const chatId = request.nextUrl.searchParams.get("chatId")?.trim();
    const includeHistory = request.nextUrl.searchParams.get("includeHistory") === "1";

    if (!chatId) {
      return jsonError("chatId is required", 400);
    }

    const context = await assertParticipantAndGetContext(request, chatId);
    const { data } = await ensureKeyDoc(chatId);

    const activeVersion = data.activeVersion;
    const activeKey = data.versions?.[String(activeVersion)];

    if (!activeKey) {
      return jsonError("Active key unavailable", 500);
    }

    if (includeHistory && context.isAdmin) {
      return NextResponse.json({
        activeVersion,
        key: activeKey,
        versions: data.versions
      });
    }

    // Participants also need version history to decrypt older messages after key rotation.
    return NextResponse.json({
      activeVersion,
      key: activeKey,
      versions: data.versions
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHENTICATED") return jsonError("Unauthenticated", 401);
    if (error?.message === "CHAT_NOT_FOUND") return jsonError("Chat not found", 404);
    if (error?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    const message = String(error?.message || "");
    if (message.includes("Missing Firebase Admin credentials")) {
      return jsonError("Encryption service unavailable: missing Firebase Admin credentials", 503);
    }
    if (message.includes("Failed to determine project ID") || message.includes("metadata.google.internal")) {
      return jsonError("Encryption service unavailable: Firebase Admin project ID not configured", 503);
    }

    console.error("GET /api/chat/encryption/key error", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: message || "Unknown server error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: "rotate" | "encryptExisting";
      chatId?: string;
    };

    const action = body.action;
    const chatId = body.chatId?.trim();

    if (!action || !chatId) {
      return jsonError("action and chatId are required", 400);
    }

    const context = await assertParticipantAndGetContext(request, chatId);
    if (!context.isAdmin) {
      return jsonError("Only chat admins can perform this action", 403);
    }

    const { keyRef, data } = await ensureKeyDoc(chatId);

    if (action === "rotate") {
      const nextVersion = (data.activeVersion || 1) + 1;
      const versions = {
        ...(data.versions || {}),
        [String(nextVersion)]: randomBytes(32).toString("base64")
      };

      await keyRef.set(
        {
          activeVersion: nextVersion,
          versions,
          updatedAt: new Date()
        },
        { merge: true }
      );

      return NextResponse.json({ ok: true, activeVersion: nextVersion });
    }

    if (action === "encryptExisting") {
      const activeVersion = data.activeVersion;
      const activeKey = data.versions?.[String(activeVersion)];

      if (!activeKey) {
        return jsonError("No active key found", 500);
      }

      const messagesSnapshot = await adminDb()
        .collection("messages")
        .where("chatId", "==", chatId)
        .get();

      const toEncrypt = messagesSnapshot.docs.filter((messageDoc) => {
        const payload = messageDoc.data();
        return !payload.encrypted;
      });

      if (!toEncrypt.length) {
        return NextResponse.json({ ok: true, updatedCount: 0 });
      }

      let batch = adminDb().batch();
      let opCount = 0;
      let updatedCount = 0;

      for (const messageDoc of toEncrypt) {
        const payload = messageDoc.data();
        const encrypted = encryptWithRawKey(String(payload.content || ""), activeKey);

        batch.update(messageDoc.ref, {
          content: encrypted.cipherText,
          encrypted: true,
          encryptionVersion: activeVersion,
          encryptionIv: encrypted.iv
        });

        opCount += 1;
        updatedCount += 1;

        if (opCount >= 400) {
          await batch.commit();
          batch = adminDb().batch();
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      return NextResponse.json({ ok: true, updatedCount });
    }

    return jsonError("Unsupported action", 400);
  } catch (error: any) {
    if (error?.message === "UNAUTHENTICATED") return jsonError("Unauthenticated", 401);
    if (error?.message === "CHAT_NOT_FOUND") return jsonError("Chat not found", 404);
    if (error?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    const message = String(error?.message || "");
    if (message.includes("Missing Firebase Admin credentials")) {
      return jsonError("Encryption service unavailable: missing Firebase Admin credentials", 503);
    }
    if (message.includes("Failed to determine project ID") || message.includes("metadata.google.internal")) {
      return jsonError("Encryption service unavailable: Firebase Admin project ID not configured", 503);
    }

    console.error("POST /api/chat/encryption/key error", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: message || "Unknown server error"
      },
      { status: 500 }
    );
  }
}
