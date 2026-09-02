import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Rajput Furniture House",
  description: "Furniture Workshop Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Sidebar />
          <main className="lg:ml-64 min-h-screen bg-gray-50 pt-14 lg:pt-0">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
