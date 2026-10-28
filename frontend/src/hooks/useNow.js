"use client";
import { useEffect, useState } from "react";

const nowSeconds = () => Math.floor(Date.now() / 1000);

// Current unix time in seconds, refreshed every `everyMs`. Keeps Date.now() out of render.
export function useNow(everyMs = 30000) {
  const [now, setNow] = useState(nowSeconds);
  useEffect(() => {
    const id = setInterval(() => setNow(nowSeconds()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
