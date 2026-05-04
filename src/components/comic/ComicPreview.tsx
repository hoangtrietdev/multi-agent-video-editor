"use client";
import { useState } from "react";
import { useOrchestrationStore } from "@/store/orchestrationStore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ComicPreview() {
  const generatedComic = useOrchestrationStore((s) => s.generatedComic);
  const mediaItems = useOrchestrationStore((s) => s.mediaItems);
  const selectedItems = mediaItems.filter((m) => m.selected);
  const config = useOrchestrationStore((s) => s.config);
  const setStep = useOrchestrationStore((s) => s.setStep);
  const setOrchestrationStarted = useOrchestrationStore((s) => s.setOrchestrationStarted);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  if (!generatedComic) return null;

  const getThemeFilter = () => {
    const theme = config.narrativeTheme;
    if (theme === "Action" || theme === "Sci-Fi") return "western-comic";
    if (theme === "Slice of Life" || theme === "Fantasy") return "anime-style";
    if (theme === "Comedy") return "manga-style";
    return "anime-style";
  };
  const activeFilterId = getThemeFilter();

  const handleBack = () => {
    setOrchestrationStarted(false);
    setStep("configure");
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < generatedComic.pages.length; i++) {
        const pageId = `pdf-page-${generatedComic.pages[i].pageNumber}`;
        const element = document.getElementById(pageId);
        if (!element) continue;

        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = imgProps.width / imgProps.height;
        let finalWidth = pdfWidth;
        let finalHeight = finalWidth / ratio;

        if (finalHeight > pdfHeight) {
          finalHeight = pdfHeight;
          finalWidth = finalHeight * ratio;
        }

        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = (pdfHeight - finalHeight) / 2;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", xOffset, yOffset, finalWidth, finalHeight);
      }
      pdf.save(`${generatedComic.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch (e) {
      console.error("PDF Export failed", e);
    } finally {
      setIsExporting(false);
    }
  };

  const renderPage = (page: any, isExportMode: boolean = false) => (
    <div key={page.pageNumber} id={isExportMode ? `pdf-page-${page.pageNumber}` : undefined} style={{
      background: "#fff", padding: isExportMode ? "32px" : "12px", borderRadius: isExportMode ? "0" : "8px",
      border: "4px solid #000", boxShadow: isExportMode ? "none" : "8px 8px 0 rgba(245,158,11,0.5)",
      width: isExportMode ? "800px" : "100%", margin: "0 auto"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: page.panels.length > 1 ? "1fr 1fr" : "1fr", gap: "8px" }}>
        {page.panels.map((panel: any, idx: number) => {
          const item = selectedItems[panel.panelIndex % selectedItems.length];
          if (!item) return null;
          return (
            <div key={idx} style={{
              position: "relative", border: "3px solid #000", overflow: "hidden",
              background: "#f0f0f0", display: "flex", flexDirection: "column"
            }}>
              {panel.caption && (
                <div style={{ background: "#FFFBCC", borderBottom: "3px solid #000", padding: "6px", fontSize: isExportMode ? "18px" : "12px", fontWeight: "bold", fontFamily: "sans-serif", color: "#000" }}>
                  {panel.caption}
                </div>
              )}
              <div style={{ position: "relative", flex: 1, minHeight: isExportMode ? "400px" : "200px" }}>
                <img src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `url(#${activeFilterId})` }} alt="comic panel" crossOrigin="anonymous" />
                {panel.speechBubble && (
                  <div style={{
                    position: "absolute", bottom: "10px", right: "10px", left: "20px",
                    background: "#fff", border: "2px solid #000", borderRadius: "16px",
                    padding: "8px 12px", fontSize: isExportMode ? "18px" : "13px", fontWeight: "bold", color: "#000",
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
      <div style={{ textAlign: "right", marginTop: "12px", fontWeight: "bold", fontSize: isExportMode ? "16px" : "12px", color: "#000" }}>Page {page.pageNumber}</div>
    </div>
  );

  return (
    <section style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "100px", position: "relative" }}>
      
      {/* SVG Cartoon Filters Definition */}
      <svg width="0" height="0" style={{ position: "absolute", zIndex: -1 }}>
        <defs>
          {/* 1. Western Comic (Action / Sci-Fi) - Ink lines & Posterized */}
          <filter id="western-comic" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="smoothed" />
            <feConvolveMatrix in="smoothed" order="3" kernelMatrix="1 1 1 1 -8 1 1 1 1" result="edges" />
            <feColorMatrix in="edges" type="matrix" values="-1 -1 -1 0 1  -1 -1 -1 0 1  -1 -1 -1 0 1  0 0 0 1 0" result="inkLines" />
            <feComponentTransfer in="inkLines" result="boldLines">
               <feFuncR type="linear" slope="4" intercept="-1.5" />
               <feFuncG type="linear" slope="4" intercept="-1.5" />
               <feFuncB type="linear" slope="4" intercept="-1.5" />
            </feComponentTransfer>
            <feComponentTransfer in="SourceGraphic" result="posterized">
              <feFuncR type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1" />
              <feFuncG type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1" />
              <feFuncB type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1" />
            </feComponentTransfer>
            <feBlend mode="multiply" in="boldLines" in2="posterized" />
          </filter>

          {/* 2. Anime Style (Slice of Life / Fantasy) - Painterly, Soft Glow, Vibrant */}
          <filter id="anime-style" colorInterpolationFilters="sRGB">
            {/* Blur to kill texture noise slightly */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
            {/* Unsharp mask to flatten colors but keep sharp structural boundaries */}
            <feConvolveMatrix in="blur" order="3" kernelMatrix="0 -1 0  -1 5 -1  0 -1 0" result="sharpened" />
            {/* Boost colors and add a slight cinematic blue-ish tint to shadows */}
            <feComponentTransfer in="sharpened" result="vibrant">
              <feFuncR type="linear" slope="1.2" intercept="0.05" />
              <feFuncG type="linear" slope="1.2" intercept="0.05" />
              <feFuncB type="linear" slope="1.3" intercept="0.1" />
            </feComponentTransfer>
            {/* Bloom effect (soft dreamy glow) */}
            <feGaussianBlur in="vibrant" stdDeviation="3" result="glow" />
            <feBlend mode="screen" in="glow" in2="vibrant" />
          </filter>

          {/* 3. Manga Style (Comedy) - Soft Pastel, Cute, Colorful */}
          <filter id="manga-style" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
            {/* Boost brightness and add a warm peach/pink pastel tint */}
            <feComponentTransfer in="blur" result="pastel">
              <feFuncR type="linear" slope="1.2" intercept="0.05" />
              <feFuncG type="linear" slope="1.1" intercept="0.05" />
              <feFuncB type="linear" slope="1.15" intercept="0.1" />
            </feComponentTransfer>
            {/* Soft edge outlines without harsh black */}
            <feConvolveMatrix in="blur" order="3" kernelMatrix="-1 -1 -1  -1 8 -1  -1 -1 -1" result="edges" />
            <feColorMatrix in="edges" type="matrix" values="-0.3 0 0 0 1  0 -0.3 0 0 0.9  0 0 -0.3 0 0.95  0 0 0 1 0" result="softEdges" />
            <feBlend mode="multiply" in="softEdges" in2="pastel" />
          </filter>
        </defs>
      </svg>
      
      {/* Hidden Export Container */}
      <div style={{ position: "absolute", top: "-9999px", left: "-9999px", zIndex: -100, pointerEvents: "none", opacity: 0 }}>
        {generatedComic.pages.map(p => renderPage(p, true))}
      </div>

      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "impact, sans-serif", textTransform: "uppercase", fontSize: "36px", margin: 0, color: "var(--color-amber-400)", textShadow: "2px 2px 0 rgba(0,0,0,0.5)" }}>
          {generatedComic.title}
        </h1>
      </div>

      {/* Slideshow controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <button 
          onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
          disabled={currentPageIndex === 0}
          style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--color-slate-800)", color: "white", border: "none", cursor: currentPageIndex === 0 ? "not-allowed" : "pointer", opacity: currentPageIndex === 0 ? 0.3 : 1 }}
        >
          ←
        </button>
        <span style={{ color: "var(--color-slate-300)", fontWeight: 600 }}>
          Page {currentPageIndex + 1} of {generatedComic.pages.length}
        </span>
        <button 
          onClick={() => setCurrentPageIndex(p => Math.min(generatedComic.pages.length - 1, p + 1))}
          disabled={currentPageIndex === generatedComic.pages.length - 1}
          style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--color-slate-800)", color: "white", border: "none", cursor: currentPageIndex === generatedComic.pages.length - 1 ? "not-allowed" : "pointer", opacity: currentPageIndex === generatedComic.pages.length - 1 ? 0.3 : 1 }}
        >
          →
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "32px", overflow: "hidden" }}>
        {renderPage(generatedComic.pages[currentPageIndex])}
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
        <button
          onClick={handleBack}
          disabled={isExporting}
          style={{
            flex: "0 0 auto", padding: "0 20px", height: "48px", borderRadius: "12px",
            background: "var(--color-slate-800)", border: "1px solid var(--color-slate-700)",
            color: "var(--color-slate-300)", fontWeight: 600, cursor: isExporting ? "not-allowed" : "pointer"
          }}
        >
          Back
        </button>
        <button
          className="btn-primary"
          disabled={isExporting}
          style={{ flex: 1, background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)", boxShadow: "0 4px 14px rgba(245,158,11,0.4)", cursor: isExporting ? "wait" : "pointer", opacity: isExporting ? 0.7 : 1 }}
          onClick={exportPDF}
        >
          {isExporting ? "Generating PDF..." : "Export PDF"}
        </button>
      </div>
    </section>
  );
}
