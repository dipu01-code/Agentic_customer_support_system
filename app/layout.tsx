import "./globals.css";
import type { Metadata } from "next";
import { FirebaseAuthProvider } from "@/components/firebase-auth-provider";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: appConfig.appName,
  description: "Production-ready starter for an AI customer support system with user and admin roles."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
      </body>
    </html>
  );
}
