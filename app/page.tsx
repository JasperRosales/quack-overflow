import Link from "next/link";

export default function Home() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">Quack Overflow</h1>
      <Link href="/duck">Duck</Link>
    </div>
  );
}
