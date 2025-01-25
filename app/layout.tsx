import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tuples | Collaborative BTech Student Community ",
  description: "Connect, collaborate, and create innovative projects with fellow tech students. Find teammates, join exciting projects, and accelerate your professional growth.",
  keywords: [
    "student project collaboration",
    "tech community platform", 
    "project networking",
    "student tech projects",
    "skill sharing",
    "team formation",
    "tech networking",
    "project management",
    "student innovation",
    "engineering collaboration",
    "Mar Baselios College of Engineering and Technology",
    "MBCET",
    "KTU",
    "MBCET DATING",
    "community",
    "tech community",
    "student community",
    "student tech community",
    "MBCET tech community",
    "MBCET student community",
    "MBCET tech student community",
    "MBCET tech students",
    "MBCET students",
  ],
  openGraph: {
    title: "Tuples - Collaborative BTech Student Community",
    description: "Join a vibrant community of MBCET btech students creating innovative projects together.",
    type: "website",
    url: "https://tuples.vercel.app",
    images: [
      {
        url: "https://tuples.vercel.app/Tuples.png",
        width: 1200,
        height: 630,
        alt: "Tuples - Collaborative Tech Projects"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Tuples | Tech Project Collaboration",
    description: "Connect, collaborate, and innovate with fellow tech students.",
    images: ["https://tuples.vercel.app/Tuples.png"]
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/Tuples.png",
    shortcut: "/Tuples.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  },
  alternates: {
    canonical: "https://tuples.vercel.app"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} custom-scrollbar`}>
      <Toaster />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}