"use client";
import { LandingPage } from "@/components/landing-page";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/login");
  };

  return <LandingPage onGetStarted={handleGetStarted} />;
}
