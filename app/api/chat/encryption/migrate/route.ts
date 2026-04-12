import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createCipheriv } from "crypto";
import { adminAuth, adminDb } from "@/app/lib/firebaseAdmin";

const jsonError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

const getBearerToken = (request: NextRequest) => {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
};

const encryptWithRawKey = (plainText: string, keyBase64: string) => {
  const key = Buffer.from(keyBase64, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipherText: Buffer.concat([encrypted, tag]).toString("base64"),
    iv: iv.toString("base64")
  };
};

const isPlatformAdmin = async (uid: string) => {
  const userSnapshot = await adminDb().collection("users").doc(uid).get();
  return userSnapshot.exists && userSnapshot.data()?.role === "admin";
};

const ensureKeyDoc = async (chatId: string) => {
  const keyRef = adminDb().collection("chatEncryptionKeys").doc(chatId);
  const keySnapshot = await keyRef.get();

  if (keySnapshot.exists) {
    const data = keySnapshot.data() as { activeVersion?: number; versions?: Record<string, string> };
    if (data.activeVersion && data.versions?.[String(data.activeVersion)]) {
      return { keyRef, activeVersion: data.activeVersion, activeKey: data.versions[String(data.activeVersion)] };
    }
  }

  const activeVersion = 1;
  const activeKey = randomBytes(32).toString("base64");
  await keyRef.set({
    activeVersion,
    versions: { "1": activeKey },
    updatedAt: new Date()
  }, { merge: true });

  return { keyRef, activeVersion, activeKey };
};

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) return jsonError("Unauthenticated", 401);

    const decoded = await adminAuth().verifyIdToken(token);
    const platformAdmin = await isPlatformAdmin(decoded.uid);
    if (!platformAdmin) return jsonError("Forbidden", 403);

    const body = (await request.json().catch(() => ({}))) as { chatId?: string; action?: string };

    if (body.action === "seedAll") {
      const chatsSnapshot = await adminDb().collection("chats").get();
      let createdCount = 0;

      for (const chatDoc of chatsSnapshot.docs) {
        const keyRef = adminDb().collection("chatEncryptionKeys").doc(chatDoc.id);
        const existing = await keyRef.get();
        if (existing.exists) continue;

        createdCount += 1;
        await keyRef.set({
          activeVersion: 1,
          versions: { "1": randomBytes(32).toString("base64") },
          updatedAt: new Date()
        });
      }

      return NextResponse.json({ ok: true, createdCount });
    }

    if (body.action === "encryptAllExisting") {
      const chatsSnapshot = await adminDb().collection("chats").get();
      let updatedCount = 0;

      for (const chatDoc of chatsSnapshot.docs) {
        try {
          const { activeVersion, activeKey } = await ensureKeyDoc(chatDoc.id);
          const messagesSnapshot = await adminDb()
            .collection("messages")
            .where("chatId", "==", chatDoc.id)
            .get();

          const plaintextMessages = messagesSnapshot.docs.filter((messageDoc) => !messageDoc.data()?.encrypted);
          if (!plaintextMessages.length) continue;

          let batch = adminDb().batch();
          let opCount = 0;

          for (const messageDoc of plaintextMessages) {
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
        } catch (chatErr) {
          console.error(`Failed to encrypt chat ${chatDoc.id}:`, chatErr);
          // Continue with next chat instead of failing whole operation
        }
      }

      return NextResponse.json({ ok: true, updatedCount });
    }

    if (body.action === "repairMetadata") {
      const messagesSnapshot = await adminDb().collection("messages").where("encrypted", "==", true).get();
      let repairedCount = 0;
      let skippedCount = 0;

      let batch = adminDb().batch();
      let opCount = 0;

      for (const messageDoc of messagesSnapshot.docs) {
        const payload = messageDoc.data() as {
          encryptionIv?: string;
          encryptionVersion?: number;
          encryption?: {
            iv?: string;
            version?: number;
          };
        };

        const normalizedIv = payload.encryptionIv || payload.encryption?.iv;
        const normalizedVersion = payload.encryptionVersion || payload.encryption?.version || 1;

        // If we still don't have an IV, metadata cannot be repaired for this message.
        if (!normalizedIv) {
          skippedCount += 1;
          continue;
        }

        const needsRepair = payload.encryptionIv !== normalizedIv || payload.encryptionVersion !== normalizedVersion;
        if (!needsRepair) {
          continue;
        }

        batch.update(messageDoc.ref, {
          encryptionIv: normalizedIv,
          encryptionVersion: normalizedVersion,
          encrypted: true,
          encryption: {
            iv: normalizedIv,
            version: normalizedVersion,
            algorithm: "AES-GCM"
          }
        });

        repairedCount += 1;
        opCount += 1;

        if (opCount >= 400) {
          await batch.commit();
          batch = adminDb().batch();
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      return NextResponse.json({ ok: true, repairedCount, skippedCount, totalEncrypted: messagesSnapshot.size });
    }

    return jsonError("Unsupported action", 400);
  } catch (error: any) {
    const message = String(error?.message || "");
    console.error("POST /api/chat/encryption/migrate error:", error);
    
    if (message.includes("Missing Firebase Admin credentials")) {
      return jsonError("Encryption service unavailable: missing Firebase Admin credentials", 503);
    }
    if (message.includes("Firebase Admin project ID missing")) {
      return jsonError("Encryption service unavailable: Firebase Admin project ID not configured", 503);
    }
    if (message.includes("Failed to determine project ID") || message.includes("metadata.google.internal")) {
      return jsonError("Encryption service unavailable: Firebase Admin project ID not configured", 503);
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: message || "Unknown server error"
      },
      { status: 500 }
    );
  }
}