/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
      FIREBASE_APIKEY: process.env.FIREBASE_APIKEY,
      FBASE_AUTH_DOMAIN: process.env.FBASE_AUTH_DOMAIN,
      FBASE_MESSAGING_SENDER_ID: process.env.FBASE_MESSAGING_SENDER_ID,
      FBASE_APP_ID: process.env.FBASE_APP_ID,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
  },
  images: {
      domains: ['firebasestorage.googleapis.com'],
  },
};

export default nextConfig;