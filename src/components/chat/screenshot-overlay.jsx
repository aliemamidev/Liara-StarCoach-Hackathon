import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function selectionRect(start, current) {
  const left = Math.min(start.x, current.x);
  const top = Math.min(start.y, current.y);
  return { left, top, width: Math.abs(current.x - start.x), height: Math.abs(current.y - start.y) };
}

export function ScreenshotOverlay({ onCapture, onCancel }) {
  const [selection, setSelection] = useState(null);
  const startRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !capturing) onCancel();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [capturing, onCancel]);

  function point(event) {
    return { x: Math.max(0, Math.min(event.clientX, window.innerWidth)), y: Math.max(0, Math.min(event.clientY, window.innerHeight)) };
  }

  function handlePointerDown(event) {
    if (capturing) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const next = point(event);
    startRef.current = next;
    setSelection({ left: next.x, top: next.y, width: 0, height: 0 });
  }

  function handlePointerMove(event) {
    if (!startRef.current || capturing) return;
    setSelection(selectionRect(startRef.current, point(event)));
  }

  async function handlePointerUp(event) {
    if (!startRef.current || capturing) return;
    const rect = selectionRect(startRef.current, point(event));
    startRef.current = null;
    if (rect.width < 4 || rect.height < 4) {
      setSelection(null);
      return;
    }
    setSelection(rect);
    setCapturing(true);
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        ignoreElements: (element) => element.hasAttribute("data-screenshot-ignore"),
      });
      const scale = canvas.width / window.innerWidth;
      const crop = document.createElement("canvas");
      crop.width = Math.round(rect.width * scale);
      crop.height = Math.round(rect.height * scale);
      crop.getContext("2d").drawImage(canvas, rect.left * scale, rect.top * scale, crop.width, crop.height, 0, 0, crop.width, crop.height);
      const blob = await new Promise((resolve) => crop.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("screenshot-empty");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      onCapture(new File([blob], `screenshot-${timestamp}.png`, { type: "image/png" }));
    } catch {
      onCancel("گرفتن تصویر ممکن نشد. دوباره تلاش کنید.");
    }
  }

  return (
    <div className="chat-screenshot-overlay" data-screenshot-ignore="true" role="dialog" aria-label="انتخاب محدوده‌ی Screenshot">
      <div className="chat-screenshot-toolbar" data-screenshot-ignore="true">
        <span>{capturing ? "در حال ساخت تصویر..." : "با کشیدن ماوس محدوده را انتخاب کنید"}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onCancel()} disabled={capturing}>
          <X size={15} aria-hidden="true" /> لغو
        </Button>
      </div>
      <div className="chat-screenshot-canvas" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        {selection && <div className="chat-screenshot-selection" data-screenshot-ignore="true" style={{ left: selection.left, top: selection.top, width: selection.width, height: selection.height }} />}
      </div>
      {selection?.width > 4 && selection?.height > 4 && !capturing && (
        <div className="chat-screenshot-size" style={{ left: selection.left, top: selection.top + selection.height + 8 }}>
          <Check size={13} aria-hidden="true" /> {Math.round(selection.width)} × {Math.round(selection.height)}
        </div>
      )}
    </div>
  );
}


