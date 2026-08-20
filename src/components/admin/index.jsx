import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpLeft,
  Bell,
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleDot,
  CircleHelp,
  Clock3,
  Database,
  Download,
  Eye,
  Filter,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessagesSquare,
  Moon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LoginForm } from "@/components/login-form";
import { useUiSound } from "@/hooks/use-ui-sound";
import {
  activeUsers,
  adminNavItems,
  adminPageMeta,
  kpis,
  messageRows,
  problemSignals,
  topics,
  unknownTopics,
  weeklyMessages,
} from "@/data/admin-dashboard";

const iconMap = {
  LayoutDashboard,
  MessagesSquare,
  CircleHelp,
  ChartNoAxesCombined,
  Users,
  Settings2,
};

const toneClasses = {
  blue: { icon: "bg-[#e7efff] text-[#3d6ee8]", line: "bg-[#4777ed]", soft: "bg-[#eff4ff] text-[#3d6ee8]" },
  teal: { icon: "bg-[#dff7f3] text-[#0d9b8b]", line: "bg-[#17ad9c]", soft: "bg-[#e8fbf7] text-[#087d70]" },
  orange: { icon: "bg-[#fff0db] text-[#e98a1d]", line: "bg-[#f19a33]", soft: "bg-[#fff5e7] text-[#b86a09]" },
  red: { icon: "bg-[#ffe5e7] text-[#d4525c]", line: "bg-[#df6770]", soft: "bg-[#fff0f1] text-[#c34650]" },
  purple: { icon: "bg-[#eee8ff] text-[#8062e6]", line: "bg-[#8768e6]", soft: "bg-[#f4f0ff] text-[#7253d2]" },
  slate: { icon: "bg-[#e9edf3] text-[#65738a]", line: "bg-[#8290a7]", soft: "bg-[#f1f4f8] text-[#5d6a80]" },
};

function Icon({ name, size = 18, ...props }) {
  const Component = iconMap[name] || CircleDot;
  return <Component size={size} strokeWidth={1.8} aria-hidden="true" {...props} />;
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#64e4d2] text-[#0e2335] shadow-[0_8px_24px_rgba(100,228,210,.2)]">
        <Sparkles size={20} strokeWidth={2.4} />
        <span className="absolute -bottom-3 -left-2 h-7 w-7 rounded-full border-2 border-[#142139] bg-[#f49a58]" />
      </div>
      <div>
        <p className="text-[17px] font-extrabold tracking-tight text-white">لیارا</p>
        <p className="text-[10px] font-semibold tracking-[0.16em] text-[#91a4bc]">ADMIN CONSOLE</p>
      </div>
    </div>
  );
}

function UserAvatar({ initials, tone = "blue", size = "md" }) {
  const sizes = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  return <span className={`inline-flex ${sizes} shrink-0 items-center justify-center rounded-xl font-bold ${toneClasses[tone].icon}`}>{initials}</span>;
}

function StatusBadge({ status, children }) {
  const styles = {
    answered: "bg-[#e8f8f1] text-[#16835c]",
    review: "bg-[#fff2df] text-[#b66b0b]",
    failed: "bg-[#ffeaec] text-[#c44952]",
  };
  const icons = { answered: CheckCircle2, review: Clock3, failed: XCircle };
  const StatusIcon = icons[status] || CircleDot;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${styles[status] || "bg-slate-100 text-slate-600"}`}><StatusIcon size={13} />{children}</span>;
}

function AdminSidebar({ activeSection, onNavigate, onLogout, user, mobile = false }) {
  return (
    <div className={`flex h-full flex-col ${mobile ? "p-5" : "px-5 py-7"}`}>
      <Brand />
      <div className="mt-10">
        <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-[#71849f]">مرکز کنترل</p>
        <nav className="space-y-1.5" aria-label="ناوبری پنل ادمین">
          {adminNavItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition ${active ? "bg-[#263752] text-white shadow-[inset_0_0_0_1px_rgba(149,255,238,.08)]" : "text-[#9aaac0] hover:bg-[#1c2a42] hover:text-white"}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${active ? "bg-[#64e4d2] text-[#11253a]" : "bg-[#1a2941] text-[#8195b0] group-hover:text-[#d2e1f4]"}`}><Icon name={item.icon} size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold">{item.label}</span>
                  <span className={`mt-0.5 block truncate text-[10px] ${active ? "text-[#a9bfd5]" : "text-[#6f829d]"}`}>{item.caption}</span>
                </span>
                {active && <ChevronLeft size={15} className="text-[#64e4d2]" />}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto space-y-4">
        <div className="rounded-2xl border border-[#2a3b56] bg-[#17263d] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-bold text-[#bdd0e5]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#64e4d2]" />وضعیت سیستم</span>
            <span className="text-[10px] font-bold text-[#64e4d2]">پایدار</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#2b3d56]"><div className="h-full w-[96%] rounded-full bg-gradient-to-l from-[#64e4d2] to-[#4387dd]" /></div>
          <p className="mt-2 text-[10px] leading-5 text-[#7990ab]">آخرین همگام‌سازی: ۲ دقیقه پیش</p>
        </div>
        <div className="flex items-center gap-3 border-t border-[#2a3b56] pt-4">
          <UserAvatar initials="س‌ک" tone="teal" size="sm" />
          <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold text-white">{user?.name || "مدیر لیارا"}</p><p className="truncate text-[10px] text-[#8295ad]">مدیر سیستم</p></div>
          <button type="button" onClick={onLogout} aria-label="خروج از پنل" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8295ad] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64e4d2]"><LogOut size={16} /></button>
        </div>
      </div>
    </div>
  );
}

function Card({ className = "", children }) {
  return <section className={`rounded-[22px] border border-[#e7ecf2] bg-white shadow-[0_10px_35px_rgba(32,58,91,.045)] ${className}`}>{children}</section>;
}

function SectionTitle({ label, action, onAction }) {
  return <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-[15px] font-extrabold text-[#1b2a41]">{label}</h2></div>{action && <button type="button" onClick={onAction} className="flex items-center gap-1 text-[11px] font-bold text-[#5273a2] transition hover:text-[#2b58a1]">{action}<ChevronLeft size={14} /></button>}</div>;
}

function Sparkline({ values, tone }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${28 - ((value - min) / Math.max(max - min, 1)) * 24}`).join(" ");
  return <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-24 overflow-visible"><polyline points={points} fill="none" stroke={tone === "teal" ? "#18a996" : tone === "orange" ? "#ed9a35" : tone === "red" ? "#db626c" : "#4e79e8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function KpiCard({ item }) {
  const positive = item.change.startsWith("+") && item.id !== "failures";
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[item.tone].icon}`}>{item.id === "messages" ? <MessagesSquare size={18} /> : item.id === "users" ? <Users size={18} /> : item.id === "unanswered" ? <CircleHelp size={18} /> : <XCircle size={18} />}</span><Sparkline values={item.trend} tone={item.tone} /></div><p className="mt-5 text-[12px] font-semibold text-[#748198]">{item.label}</p><div className="mt-1 flex items-end justify-between gap-3"><p className="text-[25px] font-extrabold tracking-tight text-[#1a2940]">{item.value}</p><span className={`mb-1 inline-flex items-center gap-0.5 text-[11px] font-bold ${positive ? "text-[#14947f]" : item.id === "failures" ? "text-[#d1545e]" : "text-[#14947f]"}`}>{item.change}{positive ? <ArrowUpLeft size={13} /> : <ArrowDownLeft size={13} />}</span></div><p className="mt-1 text-[10px] text-[#9aa6b7]">{item.note}</p></Card>;
}

function OverviewChart() {
  const max = Math.max(...weeklyMessages.map((item) => item.value));
  return <Card className="p-5"><div className="mb-8 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-bold text-[#8b99ab]">روند تعاملات</p><h2 className="mt-1 text-[17px] font-extrabold text-[#1a2940]">حجم پیام‌ها در هفته جاری</h2></div><button type="button" className="flex items-center gap-2 rounded-xl border border-[#e7ecf2] px-3 py-2 text-[11px] font-bold text-[#65738a]"><CalendarDays size={14} />۷ روز اخیر<ChevronDown size={14} /></button></div><div className="flex h-48 items-end gap-2 sm:gap-4"><div className="flex h-full flex-col justify-between pb-7 text-[10px] text-[#b0bac8]"><span>۱۰۰</span><span>۷۵</span><span>۵۰</span><span>۲۵</span><span>۰</span></div><div className="relative flex h-full flex-1 items-end justify-between gap-2 border-b border-[#edf0f4] pb-7 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[#f1f3f6] before:shadow-[0_48px_0_#f1f3f6,0_96px_0_#f1f3f6,0_144px_0_#f1f3f6]">{weeklyMessages.map((item, index) => <div className="z-10 flex h-full flex-1 flex-col items-center justify-end gap-2" key={item.day}><div className={`w-full max-w-8 rounded-t-xl transition hover:opacity-80 ${index === 5 ? "bg-gradient-to-t from-[#3f72e1] to-[#70e6d4] shadow-[0_8px_18px_rgba(70,125,224,.22)]" : "bg-[#dfe8f7]"}`} style={{ height: `${(item.value / max) * 78}%` }} /><span className="absolute bottom-0 text-[10px] font-semibold text-[#9aa6b7]">{item.day}</span></div>)}</div></div></Card>;
}

function TopicsCard({ onNavigate }) {
  return <Card className="p-5"><SectionTitle label="موضوعات پرتکرار" action="مشاهده تحلیل کامل" onAction={() => onNavigate("analytics")} /><div className="space-y-5">{topics.map((topic) => <div key={topic.label}><div className="mb-2 flex items-center justify-between text-[11px]"><span className="font-bold text-[#4f5f74]">{topic.label}</span><span className="font-extrabold text-[#1e2d43]">{topic.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#eef2f6]"><div className={`h-full rounded-full ${toneClasses[topic.tone].line}`} style={{ width: `${topic.percentage}%` }} /></div></div>)}</div><div className="mt-7 flex items-center gap-2 rounded-2xl bg-[#f3f7fd] p-3 text-[10px] leading-5 text-[#647590]"><Zap size={15} className="shrink-0 text-[#4e79e8]" />استقرار و پایگاه داده بیش از نیمی از گفت‌وگوهای این هفته را تشکیل می‌دهند.</div></Card>;
}

function SystemPulse() {
  return <Card className="overflow-hidden border-0 bg-[#14233a] p-0 text-white"><div className="relative p-5"><div className="absolute -left-8 -top-10 h-36 w-36 rounded-full bg-[#64e4d2]/10 blur-2xl" /><div className="relative flex items-start justify-between"><div><p className="text-[11px] font-bold text-[#91a8c4]">نبض سیستم</p><h2 className="mt-1 text-[18px] font-extrabold">همه‌چیز آرام است</h2></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#64e4d2]/15 text-[#64e4d2]"><ShieldCheck size={19} /></span></div><div className="relative mt-6 flex items-end gap-1.5">{[18, 25, 20, 36, 28, 46, 34, 40, 27, 51, 43, 58, 45, 62, 50, 68, 52, 74].map((height, index) => <span key={index} className={`flex-1 rounded-full ${index > 14 ? "bg-[#f29a5c]" : "bg-[#64e4d2]"}`} style={{ height }} />)}</div><div className="relative mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[10px]"><span className="text-[#8ca1bb]">پایداری ۲۴ ساعت اخیر</span><span className="font-bold text-[#64e4d2]">۹۹٫۹٪</span></div></div><div className="grid grid-cols-3 border-t border-white/10 bg-white/[.03] px-5 py-4 text-center"><div><p className="text-[15px] font-extrabold">۱۲۰ms</p><p className="mt-1 text-[9px] text-[#8499b4]">تاخیر پاسخ</p></div><div className="border-x border-white/10"><p className="text-[15px] font-extrabold">۰٫۰۲٪</p><p className="mt-1 text-[9px] text-[#8499b4]">خطای API</p></div><div><p className="text-[15px] font-extrabold">۳۲</p><p className="mt-1 text-[9px] text-[#8499b4]">درخواست فعال</p></div></div></Card>;
}

function RecentMessages({ onSelect, onNavigate }) {
  return <Card className="p-5"><SectionTitle label="آخرین پیام‌ها" action="مشاهده همه پیام‌ها" onAction={() => onNavigate("messages")} /><div className="divide-y divide-[#eef1f5]">{messageRows.slice(0, 4).map((row) => <button type="button" key={row.id} onClick={() => onSelect(row)} className="flex w-full items-center gap-3 py-3 text-right transition first:pt-0 last:pb-0 hover:bg-[#fbfcfe]"><UserAvatar initials={row.initials} tone={row.status === "review" ? "orange" : "blue"} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-[12px] font-bold text-[#293850]">{row.user}</p><span className="text-[10px] text-[#a1adbc]">{row.time}</span></div><p className="mt-1 truncate text-[11px] text-[#758298]">{row.question}</p></div><StatusBadge status={row.status}>{row.statusLabel}</StatusBadge></button>)}</div></Card>;
}

function DashboardPage({ onSelect, onNavigate }) {
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((item) => <KpiCard key={item.id} item={item} />)}</div><div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,1fr)]"><OverviewChart /><TopicsCard onNavigate={onNavigate} /></div><div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]"><RecentMessages onSelect={onSelect} onNavigate={onNavigate} /><SystemPulse /></div></div>;
}

function EmptyState({ title = "موردی پیدا نشد", description = "با تغییر فیلترها دوباره امتحان کنید." }) {
  return <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce3ec] bg-[#fbfcfe] px-5 py-14 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#6683af]"><Inbox size={22} /></span><h3 className="mt-4 text-sm font-extrabold text-[#27364d]">{title}</h3><p className="mt-1 text-xs text-[#8190a3]">{description}</p></div>;
}

function FilterBar({ search, onSearch, status, onStatus }) {
  return <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center"><div className="relative min-w-0 flex-1"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa8ba]" /><Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="جستجو در پیام‌ها، کاربران و موضوعات..." className="h-11 border-[#e4eaf1] bg-[#fbfcfe] pr-10 text-xs" /></div><div className="flex gap-2"><button type="button" onClick={() => onStatus(status === "all" ? "review" : "all")} className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${status === "review" ? "border-[#f4d3a7] bg-[#fff7eb] text-[#b86b0c]" : "border-[#e4eaf1] bg-white text-[#64738a] hover:bg-[#f7f9fc]"}`}><Filter size={15} />{status === "review" ? "نیازمند بررسی" : "همه وضعیت‌ها"}</button><button type="button" className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#e4eaf1] bg-white px-3 text-xs font-bold text-[#64738a] hover:bg-[#f7f9fc]"><SlidersHorizontal size={15} />فیلتر بیشتر</button></div></div>;
}

function MessagesPage({ onSelect }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => messageRows.filter((row) => { const haystack = `${row.user} ${row.question} ${row.topic}`.toLowerCase(); return haystack.includes(search.toLowerCase()) && (status === "all" || row.status === status); }), [search, status]);
  return <Card className="p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] text-[#8b99ab]">{filtered.length} از {messageRows.length} مکالمه</p><h2 className="mt-1 text-[17px] font-extrabold text-[#1a2940]">نمایش همه تعاملات</h2></div><Button variant="outline" size="sm" className="border-[#e4eaf1] text-xs"><Download size={15} />خروجی CSV</Button></div><FilterBar search={search} onSearch={setSearch} status={status} onStatus={setStatus} />{filtered.length === 0 ? <EmptyState title="پیامی با این مشخصات پیدا نشد" /> : <div className="overflow-x-auto rounded-2xl border border-[#edf0f4]"><table className="w-full min-w-[840px] text-right"><thead className="bg-[#f8fafc] text-[10px] font-bold text-[#8b99ab]"><tr><th className="px-4 py-3">کاربر</th><th className="px-4 py-3">پیام کاربر</th><th className="px-4 py-3">موضوع</th><th className="px-4 py-3">وضعیت</th><th className="px-4 py-3">زمان</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[#edf0f4]">{filtered.map((row) => <tr key={row.id} className="group transition hover:bg-[#fbfcfe]"><td className="px-4 py-4"><div className="flex items-center gap-2.5"><UserAvatar initials={row.initials} tone={row.status === "review" ? "orange" : row.status === "failed" ? "red" : "blue"} size="sm" /><div><p className="text-[11px] font-extrabold text-[#2a3a51]">{row.user}</p><p className="mt-0.5 text-[10px] text-[#9ba7b6]">{row.channel}</p></div></div></td><td className="max-w-[280px] px-4 py-4"><p className="truncate text-[11px] font-semibold text-[#536278]">{row.question}</p></td><td className="px-4 py-4"><span className="rounded-lg bg-[#f1f4f8] px-2 py-1 text-[10px] font-bold text-[#69778b]">{row.topic}</span></td><td className="px-4 py-4"><StatusBadge status={row.status}>{row.statusLabel}</StatusBadge></td><td className="whitespace-nowrap px-4 py-4 text-[10px] font-semibold text-[#9ba7b6]">{row.time}</td><td className="px-4 py-4"><button type="button" onClick={() => onSelect(row)} aria-label={`مشاهده مکالمه ${row.user}`} className="rounded-lg p-2 text-[#8d9aab] opacity-70 transition hover:bg-[#eef4fb] hover:text-[#4c72bc] group-hover:opacity-100"><Eye size={16} /></button></td></tr>)}</tbody></table></div>}</Card>;
}

function UnansweredPage({ items, onResolve, onSelect }) {
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]"><Card className="p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] text-[#8b99ab]">{items.length} موضوع در صف</p><h2 className="mt-1 text-[17px] font-extrabold text-[#1a2940]">موضوعات نیازمند بررسی</h2></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff3e1] text-[#e38a21]"><AlertTriangle size={18} /></span></div>{items.length === 0 ? <EmptyState title="صف بررسی خالی است" description="همه‌ی سیگنال‌ها رسیدگی شده‌اند." /> : <div className="space-y-3">{items.map((item) => <div key={item.id} className="rounded-2xl border border-[#edf0f4] p-4 transition hover:border-[#d9e2ee] hover:shadow-sm"><div className="flex items-start gap-3"><span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.severity === "high" ? "bg-[#e66b72]" : item.severity === "medium" ? "bg-[#eea143]" : "bg-[#6f8fc2]"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[13px] font-extrabold text-[#2a3b53]">{item.title}</h3><span className="text-[10px] font-semibold text-[#9ca8b7]">{item.lastSeen}</span></div><p className="mt-1 text-[11px] text-[#8a97a8]">{item.count} بار تکرار شده در تعاملات کاربران</p><div className="mt-3 flex flex-wrap gap-2">{item.examples.map((example) => <span key={example} className="rounded-lg bg-[#f8fafc] px-2 py-1 text-[10px] font-semibold text-[#6e7d91]">«{example}»</span>)}</div><div className="mt-4 flex items-center gap-2"><Button size="sm" className="h-8 rounded-lg bg-[#edf4ff] px-3 text-[10px] font-bold text-[#4e74bc] hover:bg-[#e2edff]" onClick={() => onSelect({ user: "گزارش موضوع ناشناخته", question: item.title, topic: "نیازمند بررسی", status: "review", statusLabel: "در انتظار اقدام", time: item.lastSeen, response: `این موضوع ${item.count} بار توسط کاربران تکرار شده و نمونه‌های آن برای بررسی تیم محتوا آماده است.` })}><Eye size={13} />جزئیات</Button><Button variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-[10px] text-[#6f7e92]" onClick={() => onResolve(item.id)}><Check size={13} />علامت‌گذاری به‌عنوان بررسی‌شده</Button></div></div></div></div>)}</div>}</Card><div className="space-y-5"><Card className="p-5"><SectionTitle label="راهنمای اولویت‌بندی" /><div className="space-y-4"><div className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#e66b72]" /><div><p className="text-xs font-extrabold text-[#35455c]">اولویت بالا</p><p className="mt-1 text-[10px] leading-5 text-[#8a97a8]">بیش از ۳۰ بار تکرار شده یا مانع اقدام کاربر است.</p></div></div><div className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#eea143]" /><div><p className="text-xs font-extrabold text-[#35455c]">اولویت متوسط</p><p className="mt-1 text-[10px] leading-5 text-[#8a97a8]">الگوی تازه‌ای است که روند رشد دارد.</p></div></div><div className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#6f8fc2]" /><div><p className="text-xs font-extrabold text-[#35455c]">اولویت پایین</p><p className="mt-1 text-[10px] leading-5 text-[#8a97a8]">تکرار کم و اثر محدود روی مسیر کاربر.</p></div></div></div></Card><Card className="border-[#ccece6] bg-[#f1fcf9] p-5"><div className="flex items-start gap-3"><Bot size={19} className="mt-0.5 text-[#0b9b89]" /><div><h3 className="text-[13px] font-extrabold text-[#20685f]">پیشنهاد خودکار</h3><p className="mt-1 text-[11px] leading-6 text-[#55847d]">۳ موضوع مشابه را می‌توان با افزودن یک راهنمای جامع درباره «هزینه و صورتحساب» پوشش داد.</p></div></div></Card></div></div>;
}

function AnalyticsPage() {
  const max = Math.max(...weeklyMessages.map((item) => item.value));
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]"><Card className="p-5"><div className="mb-8 flex items-center justify-between"><div><p className="text-[11px] font-bold text-[#8b99ab]">روند روزانه</p><h2 className="mt-1 text-[17px] font-extrabold text-[#1a2940]">تعداد پیام‌ها و پرسش‌های بدون پاسخ</h2></div><div className="flex items-center gap-3 text-[10px] font-bold text-[#7c899a]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#4e79e8]" />کل پیام‌ها</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#f19a33]" />بدون پاسخ</span></div></div><div className="flex h-64 items-end gap-2 sm:gap-5">{weeklyMessages.map((item, index) => <div key={item.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-[88%] w-full items-end justify-center gap-1.5 sm:gap-2"><div className="w-1/2 max-w-8 rounded-t-lg bg-[#4e79e8]" style={{ height: `${(item.value / max) * (index === 5 ? 94 : 76)}%` }} /><div className="w-1/2 max-w-8 rounded-t-lg bg-[#f3b15d]" style={{ height: `${[42, 36, 48, 31, 39, 24, 28][index]}%` }} /></div><span className="text-[10px] font-semibold text-[#9aa6b7]">{item.day}</span></div>)}</div></Card><Card className="p-5"><SectionTitle label="مشکلات رایج کاربران" action="۳۰ روز" /><div className="space-y-5">{problemSignals.map((signal) => <div key={signal.label} className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[signal.tone].icon}`}>{signal.tone === "orange" ? <AlertTriangle size={16} /> : signal.tone === "red" ? <XCircle size={16} /> : <CircleHelp size={16} />}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-[11px] font-extrabold text-[#3c4b60]">{signal.label}</p><span className="text-[13px] font-extrabold text-[#28384e]">{signal.value}</span></div><p className="mt-1 text-[10px] text-[#9aa6b7]">{signal.description}</p><div className="mt-2 h-1.5 rounded-full bg-[#edf1f5]"><div className={`h-full rounded-full ${toneClasses[signal.tone].line}`} style={{ width: `${signal.progress}%` }} /></div></div></div>)}</div><div className="mt-8 rounded-2xl bg-[#f4f7fb] p-4"><p className="text-[10px] font-bold text-[#8491a3]">نرخ حل مسئله</p><p className="mt-1 text-2xl font-extrabold text-[#23344d]">۷۶٫۴٪</p><p className="mt-1 text-[10px] text-[#0e9a84]">+۵٫۱٪ نسبت به ماه قبل</p></div></Card></div>;
}

function UsersPage() {
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-[11px] font-bold text-[#8b99ab]">کل کاربران</p><p className="mt-2 text-2xl font-extrabold text-[#1a2940]">۱۲٬۶۴۰</p><p className="mt-1 text-[10px] font-bold text-[#14947f]">+۱۲٪ رشد ماهانه</p></Card><Card className="p-5"><p className="text-[11px] font-bold text-[#8b99ab]">کاربران فعال امروز</p><p className="mt-2 text-2xl font-extrabold text-[#1a2940]">۸۴۲</p><p className="mt-1 text-[10px] font-bold text-[#14947f]">+۸٫۴٪ نسبت به دیروز</p></Card><Card className="p-5"><p className="text-[11px] font-bold text-[#8b99ab]">میانگین پیام هر کاربر</p><p className="mt-2 text-2xl font-extrabold text-[#1a2940]">۲۲٫۵</p><p className="mt-1 text-[10px] font-bold text-[#9aa6b7]">در ۳۰ روز گذشته</p></Card></div><Card className="p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-[17px] font-extrabold text-[#1a2940]">بیشترین مشارکت</h2><p className="mt-1 text-[11px] text-[#8b99ab]">کاربرانی که بیشترین تعامل را داشته‌اند</p></div><Button size="sm" className="h-9 rounded-lg bg-[#eaf1ff] text-[10px] font-bold text-[#4e74bc] hover:bg-[#e0ebff]"><Plus size={14} />افزودن مدیر</Button></div><div className="overflow-x-auto rounded-2xl border border-[#edf0f4]"><table className="w-full min-w-[650px] text-right"><thead className="bg-[#f8fafc] text-[10px] font-bold text-[#8b99ab]"><tr><th className="px-4 py-3">کاربر</th><th className="px-4 py-3">ایمیل</th><th className="px-4 py-3">پیام‌ها</th><th className="px-4 py-3">پلن</th><th className="px-4 py-3">آخرین فعالیت</th></tr></thead><tbody className="divide-y divide-[#edf0f4]">{activeUsers.map((user) => <tr key={user.email} className="hover:bg-[#fbfcfe]"><td className="px-4 py-4"><div className="flex items-center gap-2.5"><UserAvatar initials={user.initials} tone={user.tone} size="sm" /><span className="text-[11px] font-extrabold text-[#2a3a51]">{user.name}</span></div></td><td className="px-4 py-4 text-[11px] text-[#7f8da0]">{user.email}</td><td className="px-4 py-4 text-[12px] font-extrabold text-[#34445c]">{user.messages}</td><td className="px-4 py-4"><span className="rounded-lg bg-[#f1f4f8] px-2 py-1 text-[10px] font-bold text-[#65738a]">{user.plan}</span></td><td className="px-4 py-4 text-[10px] font-semibold text-[#9ba7b6]">{user.lastActive}</td></tr>)}</tbody></table></div></Card></div>;
}

function ToggleRow({ icon: RowIcon, title, description, checked, onChange }) {
  return <div className="flex items-center gap-4 border-b border-[#edf0f4] py-4 last:border-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff4fb] text-[#5c7db7]"><RowIcon size={18} /></span><div className="min-w-0 flex-1"><p className="text-[12px] font-extrabold text-[#33435a]">{title}</p><p className="mt-1 text-[10px] leading-5 text-[#8a97a8]">{description}</p></div><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#18a996]" : "bg-[#d8e0e9]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "right-1" : "right-6"}`} /></button></div>;
}

function SettingsPage() {
  const [settings, setSettings] = useState({ unknown: true, failure: true, weekly: false });
  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]"><Card className="p-5"><SectionTitle label="هشدارهای مانیتورینگ" /><ToggleRow icon={CircleHelp} title="ثبت موضوعات ناشناخته" description="هر پرسشی که منبع معتبر برای آن پیدا نشد، در صف بررسی ثبت شود." checked={settings.unknown} onChange={(value) => update("unknown", value)} /><ToggleRow icon={XCircle} title="هشدار درخواست‌های ناموفق" description="وقتی نرخ خطا از آستانه تعیین‌شده عبور کرد، اعلان دریافت کنید." checked={settings.failure} onChange={(value) => update("failure", value)} /><ToggleRow icon={CalendarDays} title="گزارش هفتگی ایمیلی" description="خلاصه‌ای از KPIها و موضوعات پرتکرار هر دوشنبه ارسال شود." checked={settings.weekly} onChange={(value) => update("weekly", value)} /></Card><div className="space-y-5"><Card className="p-5"><SectionTitle label="آستانه‌ها" /><label className="block text-[11px] font-bold text-[#66758a]">حداکثر زمان پاسخ (میلی‌ثانیه)<Input defaultValue="800" className="mt-2 bg-[#fbfcfe] text-xs" /></label><label className="mt-4 block text-[11px] font-bold text-[#66758a]">تکرار لازم برای موضوع جدید<Input defaultValue="5" className="mt-2 bg-[#fbfcfe] text-xs" /></label><Button className="mt-5 h-10 w-full bg-[#1c3150] text-xs hover:bg-[#29476f]">ذخیره تنظیمات</Button></Card><Card className="border-[#dceeea] bg-[#f5fcfa] p-5"><div className="flex items-start gap-3"><LockKeyhole size={18} className="mt-0.5 text-[#139686]" /><div><h3 className="text-[12px] font-extrabold text-[#2d655e]">دسترسی امن</h3><p className="mt-1 text-[10px] leading-5 text-[#648c85]">تنظیمات فقط برای مدیران سیستم قابل مشاهده و ویرایش است.</p></div></div></Card></div></div>;
}

function ConversationDialog({ message, onClose }) {
  return <Dialog open={Boolean(message)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-2xl border-[#e4eaf1] bg-white p-0 text-right shadow-[0_24px_80px_rgba(27,47,76,.2)]"><DialogHeader className="border-b border-[#edf0f4] bg-[#fbfcfe] p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.12em] text-[#8b99ab]">جزئیات مکالمه</p><DialogTitle className="mt-2 text-xl font-extrabold text-[#1a2940]">{message?.user}</DialogTitle><DialogDescription className="mt-1 text-xs text-[#8390a2]">{message?.time} · {message?.topic}</DialogDescription></div>{message && <StatusBadge status={message.status}>{message.statusLabel}</StatusBadge>}</div></DialogHeader>{message && <div className="space-y-5 p-6"><div className="rounded-2xl bg-[#f5f7fb] p-4"><div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-[#8997a8]"><UserRound size={14} />پیام کاربر</div><p className="text-sm font-semibold leading-7 text-[#34445b]">{message.question}</p></div><div className="rounded-2xl border border-[#dcefe9] bg-[#f4fcfa] p-4"><div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-[#159787]"><Bot size={14} />پاسخ دستیار</div><p className="text-sm leading-7 text-[#41665f]">{message.response}</p></div><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-[10px] text-[#8b99ab]"><Database size={14} />منبع: پایگاه دانش لیارا</div><Button variant="outline" size="sm" className="border-[#e3eaf1] text-[10px]" onClick={onClose}><X size={14} />بستن</Button></div></div>}</DialogContent></Dialog>;
}

function AdminHeader({ onMenu, onNavigate, onRefresh, onLogout, user }) {
  const { resolvedTheme, setTheme } = useTheme();
  const sound = useUiSound();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  return <header className="sticky top-0 z-20 border-b border-[hsl(var(--site-border)/.9)] bg-[hsl(var(--site-bg)/.9)] px-4 py-3 backdrop-blur-xl sm:px-7 lg:px-10"><div className="flex items-center gap-3"><button type="button" onClick={onMenu} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))] text-[hsl(var(--site-muted))] lg:hidden" aria-label="باز کردن منو"><Menu size={19} /></button><div className="relative hidden w-[min(360px,42vw)] sm:block"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--site-muted))]" /><input className="h-10 w-full rounded-xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-input))] pr-10 text-xs text-[hsl(var(--site-text))] outline-none placeholder:text-[hsl(var(--site-muted))] focus:border-[hsl(var(--site-accent))]" placeholder="جستجوی سریع..." /></div><div className="mr-auto flex items-center gap-2"><button type="button" onClick={onRefresh} aria-label="به‌روزرسانی داده‌ها" className="hidden h-10 w-10 items-center justify-center rounded-xl text-[hsl(var(--site-muted))] transition hover:bg-[hsl(var(--site-surface))] hover:text-[hsl(var(--site-accent-strong))] sm:flex"><RotateCcw size={17} /></button><button type="button" onClick={() => { setTheme(isDark ? "light" : "dark"); sound.playSound("toggle"); }} aria-label={isDark ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تاریک"} className="flex h-10 w-10 items-center justify-center rounded-xl text-[hsl(var(--site-muted))] transition hover:bg-[hsl(var(--site-surface))] hover:text-[hsl(var(--site-accent-strong))]">{isDark ? <Sun size={17} /> : <Moon size={17} />}</button><button type="button" onClick={() => sound.setEnabled(!sound.enabled)} aria-label={sound.enabled ? "خاموش‌کردن افکت صوتی" : "روشن‌کردن افکت صوتی"} aria-pressed={sound.enabled} className="hidden h-10 w-10 items-center justify-center rounded-xl text-[hsl(var(--site-muted))] transition hover:bg-[hsl(var(--site-surface))] hover:text-[hsl(var(--site-accent-strong))] sm:flex">{sound.enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><button type="button" aria-label="اعلان‌ها" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[hsl(var(--site-muted))] transition hover:bg-[hsl(var(--site-surface))] hover:text-[hsl(var(--site-accent-strong))]"><Bell size={18} /><span className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-[#ed8f4b] ring-2 ring-[hsl(var(--site-bg))]" /></button><div className="mx-1 hidden h-7 w-px bg-[hsl(var(--site-border))] sm:block" /><button type="button" onClick={() => onNavigate("settings")} className="hidden items-center gap-2 rounded-xl px-2 py-1.5 text-right transition hover:bg-[hsl(var(--site-surface))] sm:flex"><UserAvatar initials="مد" tone="teal" size="sm" /><span><span className="block max-w-28 truncate text-[11px] font-extrabold text-[hsl(var(--site-text))]">{user?.name || "مدیر لیارا"}</span><span className="block text-[9px] text-[hsl(var(--site-muted))]">مدیر سیستم</span></span><ChevronDown size={14} className="text-[hsl(var(--site-muted))]" /></button><button type="button" onClick={onLogout} aria-label="خروج از پنل" className="flex h-10 w-10 items-center justify-center rounded-xl text-[hsl(var(--site-muted))] transition hover:bg-[hsl(var(--site-danger)/.1)] hover:text-[hsl(var(--site-danger-foreground))]"><LogOut size={17} /></button></div></div></header>;
}

function ThemeControls() {
  const { resolvedTheme, setTheme } = useTheme();
  const sound = useUiSound();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  return <div className="fixed start-4 top-4 z-20 flex items-center gap-2"><button type="button" onClick={() => { setTheme(isDark ? "light" : "dark"); sound.playSound("toggle"); }} aria-label={isDark ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تاریک"} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface)/.8)] text-[hsl(var(--site-muted))] shadow-sm backdrop-blur transition hover:text-[hsl(var(--site-accent-strong))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--site-accent))]">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button><button type="button" onClick={() => sound.setEnabled(!sound.enabled)} aria-label={sound.enabled ? "خاموش‌کردن افکت صوتی" : "روشن‌کردن افکت صوتی"} aria-pressed={sound.enabled} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface)/.8)] text-[hsl(var(--site-muted))] shadow-sm backdrop-blur transition hover:text-[hsl(var(--site-accent-strong))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--site-accent))]">{sound.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></div>;
}

function AdminAuthView() {
  return <><Head><title>ورود مدیران | لیارا</title><meta name="description" content="ورود امن به پنل مدیریت لیارا" /></Head><main className="admin-auth-shell relative flex min-h-dvh items-center justify-center overflow-hidden bg-[hsl(var(--site-bg))] px-4 py-16 sm:px-6"><div className="admin-auth-orb absolute -start-24 -top-24 h-72 w-72 rounded-full bg-[hsl(var(--site-accent)/.12)] blur-3xl" /><div className="admin-auth-orb absolute -bottom-32 -end-24 h-96 w-96 rounded-full bg-[hsl(var(--site-brand)/.12)] blur-3xl" /><ThemeControls /><div className="relative w-full max-w-5xl"><LoginForm /></div></main></>;
}

function AdminDashboardShell({ session }) {
  const user = session.user;
  const [activeSection, setActiveSection] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [unknownItems, setUnknownItems] = useState(unknownTopics);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("همین حالا");
  const meta = adminPageMeta[activeSection];

  const navigate = (section) => {
    setMobileOpen(false);
    if (section === activeSection) return;
    setLoading(true);
    setActiveSection(section);
    window.setTimeout(() => setLoading(false), 250);
  };

  const refresh = () => {
    setLoading(true);
    window.setTimeout(() => { setLoading(false); setLastUpdated("همین حالا"); }, 500);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.reload();
  };

  return <>
    <Head><title>پنل مدیریت لیارا</title><meta name="description" content="پنل مانیتورینگ و مدیریت دستیار هوشمند لیارا" /></Head>
    <div dir="rtl" className="admin-shell min-h-screen bg-[#f5f7fb] text-[#1a2940] selection:bg-[#bcefe7] selection:text-[#143b3a]">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 bg-[#14233a] lg:block"><AdminSidebar activeSection={activeSection} onNavigate={navigate} onLogout={logout} user={user} /></aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="right" className="w-[285px] border-[#2a3b56] bg-[#14233a] p-0 text-white"><AdminSidebar activeSection={activeSection} onNavigate={navigate} onLogout={logout} user={user} mobile /></SheetContent></Sheet>
      <div className="lg:pr-72"><AdminHeader onMenu={() => setMobileOpen(true)} onNavigate={navigate} onRefresh={refresh} onLogout={logout} user={user} /><main className="px-4 py-6 sm:px-7 lg:px-10 lg:py-8"><div className="mx-auto max-w-[1500px]"><div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[0.12em] text-[#7e8da1]"><span className="h-1.5 w-1.5 rounded-full bg-[#18a996]" />{meta.eyebrow}</div><h1 className="text-[25px] font-extrabold tracking-tight text-[#1b2b43] sm:text-[30px]">{meta.title}</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-[#8390a2]">{meta.description}</p></div><div className="flex items-center gap-2"><span className="hidden text-[10px] font-semibold text-[#9aa6b7] sm:inline">آخرین به‌روزرسانی: {lastUpdated}</span><Button variant="outline" size="sm" className="h-10 border-[#e2e8f0] bg-white text-xs text-[#5f6f84]" onClick={refresh}><RotateCcw size={14} />به‌روزرسانی</Button></div></div>{loading ? <div className="grid gap-5"><Card className="flex min-h-[420px] items-center justify-center"><div className="text-center"><span className="mx-auto flex h-11 w-11 animate-pulse items-center justify-center rounded-2xl bg-[#e9f0fb] text-[#5b7fc1]"><Wifi size={20} /></span><p className="mt-4 text-sm font-bold text-[#54647a]">در حال دریافت داده‌ها...</p><p className="mt-1 text-[11px] text-[#9aa6b7]">این صفحه لحظه‌ای دیگر آماده است.</p></div></Card></div> : activeSection === "dashboard" ? <DashboardPage onSelect={setSelectedMessage} onNavigate={navigate} /> : activeSection === "messages" ? <MessagesPage onSelect={setSelectedMessage} /> : activeSection === "unanswered" ? <UnansweredPage items={unknownItems} onResolve={(id) => setUnknownItems((current) => current.filter((item) => item.id !== id))} onSelect={setSelectedMessage} /> : activeSection === "analytics" ? <AnalyticsPage /> : activeSection === "users" ? <UsersPage /> : <SettingsPage />}</div></main></div>
    </div>
    <ConversationDialog message={selectedMessage} onClose={() => setSelectedMessage(null)} />
  </>;
}

export default function AdminShell({ session }) {
  return session ? <AdminDashboardShell session={session} /> : <AdminAuthView />;
}
