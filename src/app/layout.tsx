import type { Metadata } from "next";
import "./globals.css";
import StatusSyncer from "@/components/StatusSyncer";
import { ToastProvider } from "@/components/ui/Toast";
import TxFeedbackBar from "@/components/TxFeedbackBar";

export const metadata: Metadata = {
  title: "Commitly — Plans that don't get cancelled",
  description: "Make commitments. Show up. Build reliability.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="app-container">
            <StatusSyncer />
            <TxFeedbackBar />
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}