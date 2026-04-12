import { applicationDefault, cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App;

const getAdminProjectId = () => {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
};

const getServiceAccountFromEnv = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const projectId = getAdminProjectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId) {
    throw new Error("Missing Firebase Admin FIREBASE_PROJECT_ID");
  }
  if (!clientEmail) {
    throw new Error("Missing Firebase Admin FIREBASE_CLIENT_EMAIL");
  }
  if (!privateKey) {
    throw new Error("Missing Firebase Admin FIREBASE_PRIVATE_KEY");
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey
  };
};

const getAdminCredential = () => {
  try {
    const account = getServiceAccountFromEnv();
    return cert(account);
  } catch (err) {
    // Only try ADC when explicitly configured.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      if (!getAdminProjectId()) {
        throw new Error(
          "Firebase Admin project ID missing. Set FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) when using GOOGLE_APPLICATION_CREDENTIALS."
        );
      }
      return applicationDefault();
    }

    throw err;
  }
};

export const getFirebaseAdminApp = () => {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  try {
    const projectId = getAdminProjectId();
    adminApp = initializeApp({
      credential: getAdminCredential(),
      ...(projectId ? { projectId } : {})
    });
  } catch (err) {
    const errorMsg = String(err);
    console.error("[Firebase Admin] Initialization failed:", errorMsg);
    throw err;
  }

  return adminApp;
};

export const adminAuth = () => getAuth(getFirebaseAdminApp());
export const adminDb = () => getFirestore(getFirebaseAdminApp());
