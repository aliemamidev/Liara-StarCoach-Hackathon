import { FileText, Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function AttachmentList({ files, onRemove, className }) {
  if (!files.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-2 px-2 pt-1", className)} aria-label="فایل‌های انتخاب‌شده">
      {files.map((file, index) => (
        <AttachmentPreview key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => onRemove(index)} />
      ))}
    </div>
  );
}

export function AttachmentPreview({ file, onRemove }) {
  const isImage = file.type.startsWith("image/");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isImage) return undefined;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <>
      <div className="chat-attachment-chip">
      {previewUrl ? (
        <button type="button" className="chat-attachment-preview-button" onClick={() => setPreviewOpen(true)} aria-label={`نمایش ${file.name}`}>
          <Image unoptimized width={28} height={28} src={previewUrl} alt="" className="chat-attachment-image" />
        </button>
      ) : isImage ? (
        <ImageIcon size={16} aria-hidden="true" />
      ) : (
        <FileText size={16} aria-hidden="true" />
      )}
      <span className="max-w-40 truncate" title={file.name}>{file.name}</span>
      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-full" onClick={onRemove} aria-label={`حذف ${file.name}`}>
        <X size={14} aria-hidden="true" />
      </Button>
      </div>
      {isImage && previewUrl && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent dir="rtl" className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>پیش‌نمایش تصویر</DialogTitle>
              <DialogDescription>{file.name}</DialogDescription>
            </DialogHeader>
            <div className="chat-attachment-preview-stage">
              <Image unoptimized src={previewUrl} alt={file.name} width={1600} height={1000} className="chat-attachment-preview-image" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}




