"use client";
import { useOrchestrationStore } from "@/store/orchestrationStore";
import MediaGrid from "@/components/orchestra/MediaGrid";
import ConfigForm from "@/components/orchestra/ConfigForm";
import OrchestrationFlow from "@/components/orchestra/OrchestrationFlow";
import VideoPreview from "@/components/orchestra/VideoPreview";

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
