"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/submit");
  }, [router]);

  return (
    <div className="page-wrapper" style={{ justifyContent: "center" }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );
}
