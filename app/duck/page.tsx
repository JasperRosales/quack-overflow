import type { Metadata } from "next";
import { DuckPanel } from "@/components/DuckPanel";

export const metadata: Metadata = { title: "Hardware duck · Quack Overflow" };

export default function DuckPage() {
  return <DuckPanel />;
}
