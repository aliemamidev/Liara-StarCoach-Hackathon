import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, UserRound } from "lucide-react";
import { getSession } from "@/lib/auth";

export default function AdminProfilePage({ user }) {
  return (
    <>
      <Head><title>پروفایل شما | لیارا</title><meta name="description" content="پروفایل شخصی مدیر لیارا" /></Head>
      <main dir="rtl" className="min-h-dvh bg-[hsl(var(--site-bg))] px-4 py-6 text-[hsl(var(--site-text))] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8 flex items-center justify-between gap-4">
            <Image src="/static/logo.svg" alt="لیارا" width={72} height={32} priority className="h-auto w-[72px]" />
            <Link href="/admin" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))] px-3 text-xs font-bold text-[hsl(var(--site-muted))] transition hover:text-[hsl(var(--site-accent-strong))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--site-accent))]"><ArrowRight size={15} />بازگشت به پنل</Link>
          </header>
          <section className="rounded-[24px] border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))] p-6 shadow-[0_18px_55px_hsl(var(--site-text)/.08)] sm:p-8">
            <div className="flex items-center gap-4 border-b border-[hsl(var(--site-border))] pb-7">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--site-accent)/.14)] text-[hsl(var(--site-accent-strong))]"><UserRound size={24} /></span>
              <div><h1 className="text-xl font-extrabold">{user.name || "مدیر لیارا"}</h1><p className="mt-1 flex items-center gap-1.5 text-xs text-[hsl(var(--site-muted))]" dir="ltr"><Mail size={13} />{user.email}</p></div>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[hsl(var(--site-bg))] p-4"><p className="text-[10px] font-bold text-[hsl(var(--site-muted))]">نام نمایشی</p><p className="mt-2 text-sm font-extrabold">{user.name || "مدیر لیارا"}</p></div>
              <div className="rounded-2xl bg-[hsl(var(--site-bg))] p-4"><p className="text-[10px] font-bold text-[hsl(var(--site-muted))]">ایمیل حساب</p><p className="mt-2 break-all text-sm font-bold" dir="ltr">{user.email}</p></div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const session = await getSession(req).catch(() => null);
  if (!session) return { redirect: { destination: "/admin", permanent: false } };
  return { props: { user: { name: session.user.name, email: session.user.email } } };
}
