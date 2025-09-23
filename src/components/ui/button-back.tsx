"use client";

import { ChevronLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function ButtonBack() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-500 hover:bg-green-600 text-white shadow-md p-3 transition-colors duration-200 cursor-pointer"
    >
      <ChevronLeftIcon className="w-6 h-6" />
    </button>
  );
}
