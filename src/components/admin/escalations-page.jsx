import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Clock3, Image as ImageIcon, LoaderCircle, MessageSquare, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function dateLabel(value) {
  return value ? new Date(value).toLocaleString("fa-IR") : "—";
}

export function EscalationsPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/escalations?status=${status}`);
      if (!response.ok) throw new Error("escalations-unavailable");
      setItems((await response.json()).items || []);
    } catch {
      setError("صف ارجاع‌ها در دسترس نیست.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function selectTicket(id) {
    const response = await fetch(`/api/admin/escalations/${id}`);
    if (!response.ok) return;
    const item = (await response.json()).item;
    setSelected(item);
    setAnswer(item.adminAnswer || "");
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!selected || !answer.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/escalations/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer, addToBrain: true }) });
      if (!response.ok) throw new Error("answer-failed");
      setSelected((await response.json()).item);
      setStatus("ANSWERED");
      await load();
    } catch {
      setError("ثبت پاسخ ممکن نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function closeTicket() {
    if (!selected) return;
    await fetch(`/api/admin/escalations/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "CLOSED" }) });
    setSelected(null);
    load();
  }

  return <section className="grid gap-5 xl:grid-cols-[minmax(280px,.75fr)_minmax(0,1.25fr)]">
    <div className="overflow-hidden rounded-2xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))]"><div className="flex items-center justify-between border-b border-[hsl(var(--site-border))] p-4"><div><h2 className="text-sm font-extrabold">صف ارجاع‌ها</h2><p className="mt-1 text-[11px] text-[hsl(var(--site-muted))]">پرسش‌های نیازمند پاسخ انسانی</p></div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="فیلتر ارجاع" className="h-10 rounded-xl border border-[hsl(var(--site-border))] bg-transparent px-2 text-xs"><option value="PENDING">باز</option><option value="ANSWERED">پاسخ‌داده‌شده</option><option value="CLOSED">بسته</option></select></div>{loading ? <div className="flex min-h-48 items-center justify-center text-xs font-bold"><LoaderCircle className="ml-2 animate-spin" size={17} />در حال دریافت...</div> : !items.length ? <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-5 text-center"><CheckCircle2 className="text-emerald-500" size={25} /><p className="text-sm font-extrabold">ارجاعی در این صف نیست.</p></div> : <div className="divide-y divide-[hsl(var(--site-border))]">{items.map((item) => <button type="button" key={item.id} onClick={() => selectTicket(item.id)} className={`w-full p-4 text-right transition hover:bg-[hsl(var(--site-bg))] ${selected?.id === item.id ? "bg-[hsl(var(--site-accent)/.07)]" : ""}`}><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[10px] font-bold text-[hsl(var(--site-muted))]">{item.status === "PENDING" ? <Clock3 size={14} /> : item.status === "ANSWERED" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{dateLabel(item.updatedAt)}</span><MessageSquare size={15} className="text-[hsl(var(--site-accent))]" /></div><p className="mt-2 line-clamp-2 text-xs font-extrabold leading-6">{item.clarifiedQuestion || item.userQuestion}</p></button>)}</div>}</div>
    <div className="rounded-2xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))] p-5">{error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700" role="alert">{error}</div>}{!selected ? <div className="flex min-h-[420px] flex-col items-center justify-center text-center"><MessageSquare size={32} className="text-[hsl(var(--site-muted))]" /><h2 className="mt-4 text-base font-extrabold">یک ارجاع را انتخاب کنید</h2><p className="mt-2 max-w-sm text-xs leading-6 text-[hsl(var(--site-muted))]">خلاصهٔ گفتگو، Screenshot و نتیجهٔ جست‌وجو در این بخش نمایش داده می‌شود.</p></div> : <div><div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--site-border))] pb-4"><div><p className="text-[10px] font-bold text-[hsl(var(--site-muted))]">سؤال نهایی کاربر</p><h2 className="mt-2 text-base font-extrabold leading-7">{selected.clarifiedQuestion || selected.userQuestion}</h2><p className="mt-1 text-[10px] text-[hsl(var(--site-muted))]">ثبت‌شده در {dateLabel(selected.createdAt)}</p></div><Button type="button" variant="outline" size="sm" onClick={closeTicket} disabled={selected.status === "CLOSED"}><XCircle size={14} />بستن</Button></div><div className="mt-5 space-y-4"><div><h3 className="text-xs font-extrabold">تاریخچهٔ مرتبط</h3><div className="mt-2 space-y-2">{(selected.conversationSnapshot || []).map((message) => <div key={message.id} className="rounded-xl bg-[hsl(var(--site-bg))] p-3 text-xs leading-6"><span className="font-extrabold">{message.role === "user" ? "کاربر" : "لیا"}: </span>{message.text}</div>)}</div></div>{(selected.attachmentsSnapshot || []).map((attachment) => attachment.url ? <div key={attachment.filename} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--site-border))] p-3"><ImageIcon size={16} /><Image unoptimized width={640} height={360} src={attachment.url} alt={attachment.filename} className="max-h-48 max-w-full rounded-lg object-contain" /></div> : null)}<form onSubmit={submitAnswer}><label className="block text-xs font-extrabold">پاسخ ادمین<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={selected.status === "CLOSED"} className="mt-2 min-h-36 w-full rounded-xl border border-[hsl(var(--site-border))] bg-transparent p-3 text-sm leading-7" placeholder="پاسخ دقیق و قابل‌اجرا را بنویسید..." /></label><Button type="submit" className="mt-3 h-11" disabled={saving || selected.status === "CLOSED" || !answer.trim()}>{saving ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{saving ? "در حال ارسال" : "پاسخ و افزودن به مغز"}</Button></form></div></div>}</div>
  </section>;
}
