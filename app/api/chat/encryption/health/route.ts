import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/app/lib/firebaseAdmin";

const jsonError = (message: string, status = 400, details?: string) => {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
};

const getBearerToken = (request: NextRequest) => {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
};

const assertPlatformAdmin = async (request: NextRequest) => {
  const token = getBearerToken(request);
  if (!token) throw new Error("UNAUTHENTICATED");

  const decoded = await adminAuth().verifyIdToken(token);
  const uid = decoded.uid;

  const userSnapshot = await adminDb().collection("users").doc(uid).get();
  if (!userSnapshot.exists || userSnapshot.data()?.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return uid;
};

export async function GET(request: NextRequest) {
  try {
    await assertPlatformAdmin(request);

    const chatsSnapshot = await adminDb().collection("chats").get();
    const keysSnapshot = await adminDb().collection("chatEncryptionKeys").get();

    const chatIds = new Set(chatsSnapshot.docs.map((chatDoc) => chatDoc.id));

    let validKeys = 0;
    let malformedKeys = 0;
    let missingKeys = 0;

    for (const chatId of chatIds) {
      const keyDoc = keysSnapshot.docs.find((doc) => doc.id === chatId);
      if (!keyDoc) {
        missingKeys += 1;
        continue;
      }

      const payload = keyDoc.data() as { activeVersion?: number; versions?: Record<string, string> };
      const activeVersion = payload.activeVersion;
      const activeKey = activeVersion ? payload.versions?.[String(activeVersion)] : undefined;

      if (!activeVersion || !activeKey) {
        malformedKeys += 1;
      } else {
        validKeys += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      chatsTotal: chatIds.size,
      keysTotal: keysSnapshot.size,
      validKeys,
      missingKeys,
      malformedKeys,
      ready: missingKeys === 0 && malformedKeys === 0
    });
  } catch (error: any) {
    const message = String(error?.message || "");

    if (message === "UNAUTHENTICATED") return jsonError("Unauthenticated", 401);
    if (message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (message.includes("Missing Firebase Admin credentials")) {
      return jsonError("Encryption service unavailable: missing Firebase Admin credentials", 503);
    }
    if (message.includes("Failed to determine project ID") || message.includes("metadata.google.internal")) {
      return jsonError("Encryption service unavailable: Firebase Admin project ID not configured", 503);
    }

    return jsonError("Internal server error", 500, message || "Unknown server error");
  }
}
