import { Suspense } from "react";
import type { Metadata } from "next";
import { DebugWorkspace } from "@/components/DebugWorkspace";

export const metadata: Metadata = { title: "Debug with Quack · Quack Overflow" };

export default function DebugPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Filling the pond…</div>}>
      <DebugWorkspace />
    </Suspense>
  );
}
