import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrchestrationStore } from "@/store/orchestrationStore";
import { compressAll } from "@/lib/imageCompressor";
import { DropZone } from "@/components/orchestra/MediaGrid";

interface ComicPanel {
  panelIndex: number;
  caption?: string;
  speechBubble?: string;
  layoutStyle?: string;
}
interface ComicPage {
  pageNumber: number;
  panels: ComicPanel[];
}
interface ComicScript {
  title: string;
  pages: ComicPage[];
}

export default function ComicFlow() {
  const mediaItems = useOrchestrationStore((s) => s.mediaItems);
  const selectedItems = mediaItems.filter((m) => m.selected);
  const addMediaItems = useOrchestrationStore((s) => s.addMediaItems);
  const toggleMediaItem = useOrchestrationStore((s) => s.toggleMediaItem);
  
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewComic, setPreviewComic] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [agents, setAgents] = useState([
    { id: "content", label: "Scripting Agent", icon: "✍️", status: "idle" as const, log: "Awaiting prompt..." },
    { id: "layout", label: "Layout Agent", icon: "📐", status: "idle" as const, log: "Awaiting script..." },
    { id: "cartoon", label: "Transform Agent", icon: "🎨", status: "idle" as const, log: "Awaiting layout..." },
  ]);
  const [generatedComic, setGeneratedComic] = useState<ComicScript | null>(null);

  const updateAgent = (id: string, status: "idle"|"running"|"done"|"error", log: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status, log } : a));
  };

  const handleUpload = async (fileList: FileList) => {
    if (!fileList.length) return;
    setIsUploading(true);
    const files = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    try {
      const compressed = await compressAll(files);
      const newItems = compressed.map((f) => ({
        id: Math.random().toString(36).substring(2, 9),
        url: URL.createObjectURL(f),
        name: f.name,
        type: "photo" as const,
        selected: true,
        size: f.size,
      }));
      addMediaItems(newItems);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setPreviewComic(false);
    
    // Reset agents
    setAgents([
      { id: "content", label: "Scripting Agent", icon: "✍️", status: "running", log: "Drafting story via Groq..." },
      { id: "layout", label: "Layout Agent", icon: "📐", status: "idle", log: "Awaiting script..." },
      { id: "cartoon", label: "Transform Agent", icon: "🎨", status: "idle", log: "Awaiting layout..." },
    ]);

    try {
      // 1. Content Agent (Groq)
      const res = await fetch("/api/comic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt || "A fun comic", mediaCount: selectedItems.length })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      const script = data as ComicScript;
      
      updateAgent("content", "done", `Script generated: ${script.title}`);
      
      // 2. Layout Agent
      updateAgent("layout", "running", "Arranging panels and text...");
      await new Promise(r => setTimeout(r, 1000));
      updateAgent("layout", "done", `Arranged ${script.pages.length} pages`);
      
      // 3. Cartoon Agent
      updateAgent("cartoon", "running", "Applying comic filters to images...");
      await new Promise(r => setTimeout(r, 1500));
      updateAgent("cartoon", "done", "Images processed");
      
      setGeneratedComic(script);
      setPreviewComic(true);
    } catch (err: any) {
      updateAgent("content", "error", err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ textAlign: "center" }}>
        <h2 className="text-display" style={{ margin: 0, color: "var(--color-amber-400)" }}>
          🗯 AI Comic Creator
        </h2>
        <p className="text-body-sm" style={{ color: "var(--color-slate-400)", marginTop: "4px" }}>
          Transform your photos into a 10-page comic book.
        </p>
      </div>

      {!previewComic ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Upload & Preview Section */}
          <DropZone onFiles={handleUpload} />

          <div style={{ background: "var(--color-slate-900)", padding: "16px", borderRadius: "12px", border: "1px solid var(--color-slate-800)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", color: "var(--color-slate-300)" }}>
                Selected Photos: <strong style={{ color: "var(--color-cyan)" }}>{selectedItems.length}</strong>
              </h3>
              {isUploading && <span style={{ color: "var(--color-cyan)", fontSize: "12px" }}>Uploading...</span>}
            </div>

            {/* Selected Images Grid (Cartoonified Preview) */}
            {selectedItems.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                {selectedItems.map((item) => (
                  <div key={item.id} onClick={() => toggleMediaItem(item.id)} style={{ position: "relative", cursor: "pointer", aspectRatio: "1", borderRadius: "8px", overflow: "hidden", border: "2px solid var(--color-indigo)" }}>
                    <img 
                      src={item.url} 
                      alt="comic source" 
                      style={{ 
                        width: "100%", height: "100%", objectFit: "cover",
                        // Simple CSS Cartoon Effect Preview
                        filter: "contrast(1.4) saturate(1.5) sepia(0.2) posterize(5)" 
                      }} 
                    />
                    <div style={{ position: "absolute", top: 4, right: 4, background: "white", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 8, height: 8, background: "var(--color-indigo)", borderRadius: "50%" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedItems.length === 0 && (
              <div style={{ padding: "32px 0", textAlign: "center", border: "2px dashed var(--color-slate-700)", borderRadius: "8px", color: "var(--color-slate-500)", fontSize: "12px" }}>
                Upload photos to turn them into a comic!
              </div>
            )}
          </div>

          {/* Prompt Section */}
          <div style={{ background: "var(--color-slate-900)", padding: "16px", borderRadius: "12px", border: "1px solid var(--color-slate-800)" }}>
          
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-slate-400)", marginBottom: "8px" }}>
            Comic Story Prompt:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., An epic superhero adventure in the city..."
            style={{
              width: "100%", height: "80px", padding: "12px",
              background: "var(--color-slate-800)", border: "1px solid var(--color-slate-700)",
              borderRadius: "8px", color: "white", fontSize: "14px", resize: "none"
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={isGenerating || selectedItems.length === 0}
            style={{
              width: "100%", marginTop: "16px", padding: "12px",
              background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              color: "white", fontWeight: 700, borderRadius: "8px",
              border: "none", cursor: (isGenerating || selectedItems.length === 0) ? "not-allowed" : "pointer",
              opacity: (isGenerating || selectedItems.length === 0) ? 0.6 : 1
            }}
          >
            {isGenerating ? "🗯 Processing..." : "Generate Comic"}
          </button>
        </div>

        {/* Pipeline view */}
        {isGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: "var(--color-slate-900)", padding: "16px", borderRadius: "12px", border: "1px solid var(--color-slate-800)" }}>
            <h3 style={{ margin: "0 0 16px", color: "white", fontSize: "14px" }}>Agent Pipeline</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {agents.map(a => (
                <div key={a.id} style={{ display: "flex", gap: "12px", alignItems: "center", opacity: a.status === "idle" ? 0.5 : 1 }}>
                  <div style={{ 
                    width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-slate-800)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
                    boxShadow: a.status === "running" ? "0 0 0 2px var(--color-amber-400)" : "none"
                  }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--color-slate-200)", fontSize: "13px" }}>{a.label}</div>
                    <div style={{ color: a.status === "error" ? "var(--color-red)" : "var(--color-slate-400)", fontSize: "11px" }}>{a.log}</div>
                  </div>
                  {a.status === "running" && <div className="animate-spin-slow" style={{ fontSize: "12px" }}>⚙️</div>}
                  {a.status === "done" && <div style={{ color: "var(--color-emerald-400)" }}>✓</div>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
      ) : generatedComic && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontFamily: "impact, sans-serif", textTransform: "uppercase", fontSize: "36px", margin: 0, color: "white", textShadow: "2px 2px 0 var(--color-amber-500)" }}>
              {generatedComic.title}
            </h1>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {generatedComic.pages.map((page) => (
              <div key={page.pageNumber} style={{
                background: "#fff", padding: "12px", borderRadius: "8px",
                border: "4px solid #000", boxShadow: "8px 8px 0 rgba(245,158,11,0.5)"
              }}>
                <div style={{ display: "grid", gridTemplateColumns: page.panels.length > 1 ? "1fr 1fr" : "1fr", gap: "8px" }}>
                  {page.panels.map((panel, idx) => {
                    const item = selectedItems[panel.panelIndex % selectedItems.length];
                    if (!item) return null;
                    return (
                      <div key={idx} style={{
                        position: "relative", border: "3px solid #000", overflow: "hidden",
                        background: "#f0f0f0", display: "flex", flexDirection: "column"
                      }}>
                        {/* Caption Box */}
                        {panel.caption && (
                          <div style={{ background: "#FFFBCC", borderBottom: "3px solid #000", padding: "6px", fontSize: "12px", fontWeight: "bold", fontFamily: "sans-serif", color: "#000" }}>
                            {panel.caption}
                          </div>
                        )}
                        
                        {/* Image with Filter */}
                        <div style={{ position: "relative", flex: 1, minHeight: "200px" }}>
                          <img src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.4) saturate(1.5) sepia(0.2) posterize(5)" }} alt="comic panel" />
                          
                          {/* Speech Bubble */}
                          {panel.speechBubble && (
                            <div style={{
                              position: "absolute", bottom: "10px", right: "10px", left: "20px",
                              background: "#fff", border: "2px solid #000", borderRadius: "16px",
                              padding: "8px 12px", fontSize: "13px", fontWeight: "bold", color: "#000",
                              boxShadow: "2px 2px 0 #000"
                            }}>
                              {panel.speechBubble}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ textAlign: "right", marginTop: "8px", fontWeight: "bold", fontSize: "12px", color: "#000" }}>Page {page.pageNumber}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", position: "sticky", bottom: 16 }}>
            <button style={{ flex: 1, padding: "10px", background: "var(--color-slate-800)", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
              ⬇️ Export JPG
            </button>
            <button style={{ flex: 1, padding: "10px", background: "var(--color-slate-800)", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
              ⬇️ Export PDF
            </button>
          </div>
          <button
            onClick={() => setPreviewComic(false)}
            style={{ padding: "8px", background: "transparent", color: "var(--color-slate-400)", border: "none", cursor: "pointer" }}
          >
            ← Back to Editor
          </button>
        </motion.div>
      )}
    </section>
  );
}
