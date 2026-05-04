"use client";
import { useOrchestrationStore } from "@/store/orchestrationStore";
import dynamic from "next/dynamic";

const MediaGrid = dynamic(() => import("@/components/orchestra/MediaGrid"));
const ConfigForm = dynamic(() => import("@/components/orchestra/ConfigForm"));
const OrchestrationFlow = dynamic(() => import("@/components/orchestra/OrchestrationFlow"));
const VideoPreview = dynamic(() => import("@/components/orchestra/VideoPreview"));

export default function Home() {
  const step = useOrchestrationStore((s) => s.step);

  return (
    <>
      {step === "select"      && <MediaGrid />}
      {step === "configure"   && <ConfigForm />}
      {step === "orchestrate" && <OrchestrationFlow />}
      {step === "preview"     && <VideoPreview />}
    </>
  );
}
