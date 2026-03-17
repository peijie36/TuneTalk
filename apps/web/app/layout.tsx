import Providers from "@/app/providers";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TuneTalk | Shared Listening Rooms",
  description:
    "Create and join shared listening rooms with synced playback and live chat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
