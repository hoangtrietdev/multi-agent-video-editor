"use client";
import { useOrchestrationStore } from "@/store/orchestrationStore";
import dynamic from "next/dynamic";

const MediaGrid = dynamic(() => import("@/components/orchestra/MediaGrid"));
const ConfigForm = dynamic(() => import("@/components/orchestra/ConfigForm"));
const OrchestrationFlow = dynamic(() => import("@/components/orchestra/OrchestrationFlow"));
const VideoPreview = dynamic(() => import("@/components/orchestra/VideoPreview"));

const ComicConfigForm = dynamic(() => import("@/components/comic/ComicConfigForm"));
const ComicOrchestrationFlow = dynamic(() => import("@/components/comic/ComicOrchestrationFlow"));
const ComicPreview = dynamic(() => import("@/components/comic/ComicPreview"));

export default function Home() {
  const step = useOrchestrationStore((s) => s.step);
  const appMode = useOrchestrationStore((s) => s.appMode);

  if (appMode === "comic") {
    return (
      <>
        {step === "select"      && <MediaGrid />}
        {step === "configure"   && <ComicConfigForm />}
        {step === "orchestrate" && <ComicOrchestrationFlow />}
        {step === "preview"     && <ComicPreview />}
      </>
    );
  }

  return (
    <>
      {step === "select"      && <MediaGrid />}
      {step === "configure"   && <ConfigForm />}
      {step === "orchestrate" && <OrchestrationFlow />}
      {step === "preview"     && <VideoPreview />}
    </>
  );
}
