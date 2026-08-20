import { useEffect, useState } from "react";
import { Check, CircleAlert, Laptop, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const themes = [
  { value: "system", label: "سیستم", icon: Laptop },
  { value: "light", label: "روشن", icon: Sun },
  { value: "dark", label: "تاریک", icon: Moon },
];

export function ChatSettings({ open, onOpenChange, soundEnabled, onSoundChange, playSound }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/chat-config", { signal: controller.signal })
      .then((response) => response.json())
      .then(setConfig)
      .catch(() => setConfig({ configured: false }));
    return () => controller.abort();
  }, [open]);

  function selectTheme(value) {
    setTheme(value);
    playSound("toggle");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl">
        <SheetHeader>
          <SheetTitle>تنظیمات</SheetTitle>
          <SheetDescription>ظاهر و رفتار دستیار را تنظیم کنید.</SheetDescription>
        </SheetHeader>
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="chat-setting-title">حالت نمایش</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {themes.map(({ value, label, icon: Icon }) => (
                <Button
                  type="button"
                  key={value}
                  variant={mounted && theme === value ? "default" : "outline"}
                  className="h-auto flex-col gap-2 py-3"
                  onClick={() => selectTheme(value)}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{label}</span>
                  {mounted && theme === value && <Check size={13} aria-hidden="true" />}
                </Button>
              ))}
            </div>
          </section>

          <section className="chat-setting-row">
            <div className="flex items-center gap-3">
              {soundEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
              <div>
                <h2 className="chat-setting-title">صدای رابط</h2>
                <p className="chat-setting-description">بازخورد صوتی برای تعامل‌های مهم</p>
              </div>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={(checked) => {
                onSoundChange(checked);
                if (checked) playSound("toggle");
              }}
              aria-label="روشن یا خاموش کردن صدای رابط"
            />
          </section>

          <section className="chat-connection-card">
            <div className="flex items-center gap-2">
              {config?.configured ? <Check size={16} /> : <CircleAlert size={16} />}
              <h2 className="chat-setting-title">اتصال ایجنت</h2>
            </div>
            <p className="chat-setting-description mt-2">
              {config?.configured ? "اتصال سرور آماده است." : "کلید اتصال در تنظیمات سرور وارد نشده است."}
            </p>
            <dl className="mt-4 space-y-3 text-xs">
              <div>
                <dt className="text-[hsl(var(--chat-muted))]">نشانی سرویس</dt>
                <dd className="mt-1 break-all font-mono text-left" dir="ltr">{config?.baseUrl || "در حال بررسی"}</dd>
              </div>
              <div>
                <dt className="text-[hsl(var(--chat-muted))]">مدل</dt>
                <dd className="mt-1 font-mono text-left" dir="ltr">{config?.model || "در حال بررسی"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
