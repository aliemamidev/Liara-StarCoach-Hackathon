import { FileText } from "lucide-react";

export function LinkPreviewCard({ href = "", children, imageUrl = "", description }) {
  const title = typeof children === "string" && children.trim() ? children : href;
  const isLiaraPage = /(?:^https?:\/\/)?(?:www\.)?liara\.ir\//i.test(href) || /\/documentation/i.test(href);
  return (
    <a
      href={href}
      target={/^https?:\/\//i.test(href) ? "_blank" : undefined}
      rel={/^https?:\/\//i.test(href) ? "noreferrer" : undefined}
      className="link-preview-card"
    >
      {imageUrl ? <img src={imageUrl} alt="" className="link-preview-card-image" loading="lazy" /> : isLiaraPage ? <span className="link-preview-card-image link-preview-card-icon"><FileText size={28} aria-hidden="true" /></span> : null}
      <span className="link-preview-card-body">
        <span className="link-preview-card-kicker">مقالهٔ مرتبط</span>
        <strong className="link-preview-card-title">{title}</strong>
        <span className="link-preview-card-description">{description || (isLiaraPage ? "مشاهدهٔ مقاله در مستندات لیارا" : "برای مشاهدهٔ جزئیات این صفحه کلیک کنید.")}</span>
      </span>
    </a>
  );
}
