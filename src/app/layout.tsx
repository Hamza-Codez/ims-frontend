import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ToastContainer } from "react-toastify";
import { SessionProvider } from "@/features/auth/session";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

// UIUX.md §3 — IBM Plex Sans for UI, IBM Plex Mono for every numeric/identifier value.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Inventory & Stock Movement Engine",
  description: "Warehouse operations console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
        {/* §8 — bottom-right, ~4s, restyled in globals.css (no colored rounded default) */}
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          hideProgressBar
          closeOnClick
          icon={false}
          theme="light"
        />
      </body>
    </html>
  );
}
