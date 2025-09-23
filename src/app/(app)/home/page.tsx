import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="p-6 flex flex-col items-center">
      <h1 className="text-2xl font-semibold">Home</h1>

      <Button asChild className="mt-6">
        <Link href="/create-trip">สร้างทริปใหม่</Link>
      </Button>
    </div>
  );
}
