import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main dir="rtl" className="flex min-h-dvh items-center justify-center bg-[hsl(var(--chat-bg))] px-6 text-[hsl(var(--chat-text))]">
      <section className="w-full max-w-md rounded-3xl border border-[hsl(var(--chat-border))] bg-[hsl(var(--chat-surface))] p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-[hsl(var(--chat-accent))]">خطای ۴۰۴</p>
        <h1 className="mt-3 text-2xl font-bold">این صفحه پیدا نشد</h1>
        <p className="mt-3 text-sm leading-7 text-[hsl(var(--chat-muted))]">صفحه‌ای که دنبال آن هستید وجود ندارد یا جابه‌جا شده است.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[hsl(var(--chat-accent))] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          بازگشت به گفت‌وگو
        </Link>
      </section>
    </main>
  );
}
