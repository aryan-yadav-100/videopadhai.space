import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BackendIdsProvider } from "./lib/backendIdsContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Your App",
  description: "Description",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased h-screen`}>
        <BackendIdsProvider>
          {children}
        </BackendIdsProvider>
      </body>
    </html>
  );
}
