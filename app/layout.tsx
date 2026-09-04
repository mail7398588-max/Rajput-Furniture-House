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
      <body className="bg-warm-50">
        <ToastProvider>
          <Sidebar />
          <main className="lg:ml-72 min-h-screen pt-14 lg:pt-0">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
