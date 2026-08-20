import { useRef, useState } from "react";
import { useRouter } from "next/router";
import { Eye, EyeOff, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiSound } from "@/hooks/use-ui-sound";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialValues = { email: "", password: "" };

function validate(values) {
  const errors = {};
  if (!values.email.trim()) errors.email = "ایمیل را وارد کنید.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "فرمت ایمیل صحیح نیست.";
  if (!values.password) errors.password = "رمز عبور را وارد کنید.";
  else if (values.password.length < 8) errors.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  return errors;
}

export function LoginForm({ className, ...props }) {
  const router = useRouter();
  const sound = useUiSound();
  const errorRef = useRef(null);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    if (serverError) setServerError("");
  };

  const validateField = (field) => {
    const nextErrors = validate(values);
    setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setServerError("");
    if (Object.keys(nextErrors).length) {
      sound.playSound("error");
      window.requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setLoading(true);
    sound.playSound("loading");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setServerError(result.message || "ایمیل یا رمز عبور نادرست است.");
        sound.playSound("error");
        window.requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      sound.playSound("success");
      await router.replace("/admin");
    } catch {
      setServerError("ارتباط با سامانه ورود برقرار نشد. دوباره تلاش کنید.");
      sound.playSound("error");
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  const firstError = errors.email || errors.password || serverError;

  return (
    <div className={cn("flex flex-col gap-5", className)} {...props}>
      <Card className="overflow-hidden border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))] shadow-[0_24px_80px_hsl(var(--site-text)/.12)]">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="order-2 p-6 sm:p-8 md:order-1" onSubmit={submit} noValidate>
            <div className="flex flex-col gap-6">
              <div className="text-right">
                <div className="mb-6 flex items-center justify-between md:hidden">
                  <div className="flex items-center gap-2 text-sm font-extrabold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--site-accent))] text-[hsl(var(--site-accent-foreground))]"><Sparkles size={17} /></span>لیارا</div>
                </div>
                <p className="mb-2 text-xs font-bold text-[hsl(var(--site-accent-strong))]">ورود مدیران</p>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">خوش برگشتید</h1>
                <p className="mt-3 text-sm leading-7 text-[hsl(var(--site-muted))]">برای ورود به مرکز مدیریت لیارا، اطلاعات خود را وارد کنید.</p>
              </div>

              {firstError && (
                <div ref={errorRef} tabIndex="-1" role="alert" aria-live="assertive" className="rounded-xl border border-[hsl(var(--site-danger)/.35)] bg-[hsl(var(--site-danger)/.08)] px-3 py-2.5 text-sm font-semibold leading-6 text-[hsl(var(--site-danger-foreground))] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--site-danger))]">
                  {serverError || "لطفاً خطاهای فرم را برطرف کنید."}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="admin-email">ایمیل</Label>
                <Input id="admin-email" type="email" inputMode="email" autoComplete="email" dir="ltr" value={values.email} onChange={update("email")} onBlur={() => validateField("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "admin-email-error" : undefined} placeholder="admin@example.com" className="h-12 rounded-xl border-[hsl(var(--site-border))] bg-[hsl(var(--site-input))] text-left focus-visible:ring-[hsl(var(--site-accent))]" required />
                {errors.email && <p id="admin-email-error" className="text-xs font-semibold text-[hsl(var(--site-danger-foreground))]">{errors.email}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="admin-password">رمز عبور</Label>
                <div className="relative">
                  <Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" dir="ltr" value={values.password} onChange={update("password")} onBlur={() => validateField("password")} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "admin-password-error" : undefined} className="h-12 rounded-xl border-[hsl(var(--site-border))] bg-[hsl(var(--site-input))] pe-12 text-left focus-visible:ring-[hsl(var(--site-accent))]" required />
                  <button type="button" onClick={() => { setShowPassword((current) => !current); sound.playSound("toggle"); }} aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"} className="absolute end-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-[hsl(var(--site-muted))] transition hover:bg-[hsl(var(--site-muted)/.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--site-accent))]">
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
                {errors.password && <p id="admin-password-error" className="text-xs font-semibold text-[hsl(var(--site-danger-foreground))]">{errors.password}</p>}
              </div>

              <Button type="submit" disabled={loading} aria-busy={loading} className="h-12 w-full rounded-xl bg-[hsl(var(--site-accent))] text-base font-extrabold text-[hsl(var(--site-accent-foreground))] shadow-[0_12px_28px_hsl(var(--site-accent)/.25)] hover:bg-[hsl(var(--site-accent-strong))]">
                {loading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />در حال بررسی...</> : "ورود به پنل"}
              </Button>
              <p className="text-center text-xs leading-6 text-[hsl(var(--site-muted))]">این بخش فقط برای مدیران مجاز سامانه در دسترس است.</p>
            </div>
          </form>

          <div className="login-visual order-1 relative hidden min-h-[520px] overflow-hidden bg-[hsl(var(--site-brand-surface))] p-8 text-white md:order-2 md:flex md:flex-col md:justify-between">
            <div className="login-visual-grid absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3 text-lg font-black"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--site-accent))] text-[hsl(var(--site-accent-foreground))] shadow-[0_10px_30px_hsl(var(--site-accent)/.25)]"><Sparkles size={21} /></span>لیارا</div>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white/75">مرکز مدیریت</span>
            </div>
            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[hsl(var(--site-accent))]"><ShieldCheck size={28} /></div>
              <h2 className="max-w-xs text-3xl font-black leading-[1.35]">کنترل هوشمند، آرامش بیشتر</h2>
              <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">تعاملات، کاربران و سلامت دستیار را از یک فضای امن و یکپارچه مدیریت کنید.</p>
            </div>
            <div className="relative flex items-center gap-3 border-t border-white/10 pt-5 text-xs text-white/55"><span className="h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--site-accent))]" />سامانه پایدار و آماده به کار</div>
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-xs leading-6 text-[hsl(var(--site-muted))]">با ورود به پنل، قوانین استفاده و سیاست حفظ حریم خصوصی لیارا را می‌پذیرید.</p>
    </div>
  );
}
