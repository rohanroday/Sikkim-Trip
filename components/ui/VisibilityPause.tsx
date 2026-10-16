"use client";
import { useEffect } from "react";

/** Pause every looping animation while the tab is hidden. */
export default function VisibilityPause() {
  useEffect(() => {
    const onChange = () => document.body.classList.toggle("paused", document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return null;
}
