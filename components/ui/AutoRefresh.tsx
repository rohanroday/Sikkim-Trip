"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetch server data on an interval while a booking is waiting on payment or partners. */
export default function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
