import { DuckStatePreview } from "@/components/DuckStatePreview";

export default function DuckPage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Duck</h1>
      <DuckStatePreview />
    </div>
  );
}
