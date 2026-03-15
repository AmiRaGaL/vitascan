import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VitaScan — Symptom Checker",
  description: "AI-powered symptom triage and health guidance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <SupabaseProvider>
          <Navbar />
          <main className="min-h-screen bg-gray-50">{children}</main>
        </SupabaseProvider>
      </body>
    </html>
  );
}
