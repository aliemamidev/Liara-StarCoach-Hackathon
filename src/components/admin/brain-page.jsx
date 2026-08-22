import { useCallback, useEffect, useState } from "react";
import { Brain, Check, Edit3, LoaderCircle, Power, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const initialForm = { id: "", question: "", answer: "", tags: "", isActive: true };

function dateLabel(value) {
  return value ? new Date(value).toLocaleDateString("fa-IR") : "—";
}

export function BrainPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/brain/?q=${encodeURIComponent(query)}&status=${status}`);
      if (!response.ok) throw new Error("brain-unavailable");
      setItems((await response.json()).items || []);
    } catch {
      setError("داده‌های مغز در دسترس نیست. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => { load(); }, [load]);

  function edit(item) {
    setForm({ ...item, tags: (item.tags || []).join(", ") });
    setDialogOpen(true);
  }

  function create() {
    setForm(initialForm);
    setDialogOpen(true);
  }

  async function save(event) {
    event.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    try {
      const editing = Boolean(form.id);
      const response = await fetch(editing ? `/api/admin/brain/${form.id}/` : "/api/admin/brain/", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: form.question, answer: form.answer, tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean), isActive: form.isActive }),
      });
      if (!response.ok) throw new Error("brain-save-failed");
      setDialogOpen(false);
      await load();
    } catch {
      setError("ذخیرهٔ دانش ممکن نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item) {
    await fetch(`/api/admin/brain/${item.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !item.isActive }) });
    load();
  }

  async function softDelete(item) {
    if (!window.confirm("این مورد غیرفعال شود؟")) return;
    await fetch(`/api/admin/brain/${item.id}/`, { method: "DELETE" });
    load();
  }

  return (
    <section className="space-y-5">
      <div className="admin-page-panel admin-page-toolbar flex flex-col gap-3 rounded-2xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))] p-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--site-muted))]" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load()} aria-label="جستجوی دانش" placeholder="جستجوی سؤال یا پاسخ..." className="h-11 pr-9" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="فیلتر وضعیت" className="h-11 rounded-xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))] px-3 text-xs font-bold text-[hsl(var(--site-text))]">
          <option value="active">فعال</option><option value="inactive">غیرفعال</option><option value="all">همه</option>
        </select>
        <Button type="button" onClick={create} className="h-11"><Brain size={16} />افزودن دانش</Button>
      </div>
      {error && <div className="admin-page-alert rounded-2xl border p-4 text-sm font-bold" role="alert">{error}</div>}
      <div className="admin-page-panel overflow-hidden rounded-2xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))]">
        {loading ? <div className="flex min-h-48 items-center justify-center text-sm font-bold text-[hsl(var(--site-muted))]"><LoaderCircle className="ml-2 animate-spin" size={18} />در حال دریافت دانش...</div> : !items.length ? <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center"><Brain size={26} className="text-[hsl(var(--site-accent))]" /><p className="font-extrabold">هنوز دانشی برای این فیلتر پیدا نشد.</p><Button type="button" variant="outline" onClick={create}>افزودن اولین مورد</Button></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right"><thead className="bg-[hsl(var(--site-bg))] text-[11px] text-[hsl(var(--site-muted))]"><tr><th className="px-4 py-3">سؤال</th><th className="px-4 py-3">پاسخ</th><th className="px-4 py-3">منبع</th><th className="px-4 py-3">استفاده</th><th className="px-4 py-3">به‌روزرسانی</th><th className="px-4 py-3">عملیات</th></tr></thead><tbody className="divide-y divide-[hsl(var(--site-border))]">{items.map((item) => <tr key={item.id} className="align-top"><td className="max-w-[260px] px-4 py-4 text-xs font-extrabold leading-6">{item.question}</td><td className="max-w-[320px] px-4 py-4 text-xs leading-6 text-[hsl(var(--site-muted))]">{item.answer}</td><td className="px-4 py-4 text-xs font-bold">{item.sourceType === "ADMIN" ? "ادمین" : item.sourceType === "WEB" ? "وب" : "مستندات"}</td><td className="px-4 py-4 text-xs font-bold">{item.usageCount.toLocaleString("fa-IR")}</td><td className="px-4 py-4 text-xs text-[hsl(var(--site-muted))]">{dateLabel(item.updatedAt)}</td><td className="px-4 py-4"><div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" aria-label="ویرایش دانش" onClick={() => edit(item)}><Edit3 size={16} /></Button><Button type="button" variant="ghost" size="icon" aria-label={item.isActive ? "غیرفعال‌کردن دانش" : "فعال‌کردن دانش"} onClick={() => toggle(item)}><Power size={16} /></Button><Button type="button" variant="ghost" size="icon" aria-label="حذف نرم دانش" onClick={() => softDelete(item)}><X size={16} /></Button></div></td></tr>)}</tbody></table></div>
        )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent dir="rtl" className="admin-knowledge-dialog"><DialogHeader className="admin-knowledge-header"><DialogTitle>{form.id ? "ویرایش دانش" : "افزودن دانش"}</DialogTitle><DialogDescription>این پاسخ در جست‌وجوی بعدی Lia استفاده می‌شود.</DialogDescription></DialogHeader><form onSubmit={save} className="admin-knowledge-form space-y-4"><label className="block text-xs font-bold">سؤال<input value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[hsl(var(--site-border))] bg-transparent px-3 text-sm" required /></label><label className="block text-xs font-bold">پاسخ<textarea value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} className="mt-2 min-h-40 w-full rounded-xl border border-[hsl(var(--site-border))] bg-transparent p-3 text-sm leading-6" required /></label><label className="block text-xs font-bold">برچسب‌ها<textarea value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[hsl(var(--site-border))] bg-transparent p-3 text-sm" placeholder="مثلاً: dns, خطا" /></label><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button type="submit" disabled={saving}>{saving && <LoaderCircle className="animate-spin" size={16} />}{saving ? "در حال ذخیره" : "ذخیره دانش"}<Check size={16} /></Button></div></form></DialogContent></Dialog>
    </section>
  );
}
