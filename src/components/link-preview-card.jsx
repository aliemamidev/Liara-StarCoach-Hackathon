export function LinkPreviewCard({ href = "", children }) {
  const title = typeof children === "string" && children.trim() ? children : href;
  const isLiaraPage = /(?:^https?:\/\/)?(?:www\.)?liara\.ir\//i.test(href) || /\/documentation/i.test(href);
  return (
    <a
      href={href}
      target={/^https?:\/\//i.test(href) ? "_blank" : undefined}
      rel={/^https?:\/\//i.test(href) ? "noreferrer" : undefined}
      className="link-preview-card"
    >
      {isLiaraPage && <img src="/static/images/lia-avatar.png" alt="" className="link-preview-card-image" loading="lazy" />}
      <span className="link-preview-card-body">
        <span className="link-preview-card-kicker">صفحهٔ مرتبط</span>
        <strong className="link-preview-card-title">{title}</strong>
        <span className="link-preview-card-description">{isLiaraPage ? "مشاهدهٔ این صفحه در مستندات و پنل لیارا" : "برای مشاهدهٔ جزئیات این صفحه کلیک کنید."}</span>
      </span>
    </a>
  );
}
