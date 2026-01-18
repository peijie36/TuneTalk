import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TuneTalk — Room",
};

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
