"use client";

import { useEffect, useState } from "react";

export default function GreetingText() {
  const [greeting, setGreeting] = useState("Halo");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 11) setGreeting("Selamat pagi");
    else if (h < 15) setGreeting("Selamat siang");
    else if (h < 19) setGreeting("Selamat sore");
    else setGreeting("Selamat malam");
  }, []);

  return <>{greeting} 👋</>;
}
