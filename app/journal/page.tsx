import type { Metadata } from "next";
import { Journal } from "@/components/Journal";

export const metadata: Metadata = { title: "Bug journal · Quack Overflow" };

export default function JournalPage() {
  return <Journal />;
}
