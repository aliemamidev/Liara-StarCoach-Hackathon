import { useRef, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
      const response = await fetch("/api/auth/login/", {
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
    <div className={cn("flex flex-col gap-4", className)} dir="rtl" {...props}>
      <Card className="admin-login-card h-auto max-h-full overflow-hidden rounded-[28px] border-[hsl(var(--site-border))] bg-[hsl(var(--site-surface))] shadow-[0_24px_70px_hsl(var(--site-text)/.12)]">
        <CardContent className="grid h-auto min-h-0 p-0 md:grid-cols-2">
          <form className="order-2 flex items-center p-7 sm:p-10 md:order-2 lg:p-14" onSubmit={submit} noValidate>
            <div className="w-full">
              <div className="mb-10 flex items-center justify-between md:hidden">
                <Image src="/static/logo.svg" alt="لیارا" width={91} height={40} className="h-10 w-auto" />
              </div>
              <div className="text-right">
                <h1 className="text-[28px] font-black tracking-tight text-[hsl(var(--site-text))] sm:text-3xl">ورود به پنل مدیریت</h1>
                <p className="mt-3 text-sm leading-7 text-[hsl(var(--site-muted))]">برای ادامه، اطلاعات حساب خود را وارد کنید.</p>
              </div>

              {firstError && (
                <div ref={errorRef} tabIndex="-1" role="alert" aria-live="assertive" className="rounded-xl border border-[hsl(var(--site-danger)/.35)] bg-[hsl(var(--site-danger)/.08)] px-3 py-2.5 text-sm font-semibold leading-6 text-[hsl(var(--site-danger-foreground))] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--site-danger))]">
                  {serverError || "لطفاً خطاهای فرم را برطرف کنید."}
                </div>
              )}

              <div className="mt-9 grid gap-2">
                <Label htmlFor="admin-email" className="text-[13px] font-extrabold">ایمیل</Label>
                <Input id="admin-email" type="email" inputMode="email" autoComplete="email" dir="ltr" value={values.email} onChange={update("email")} onBlur={() => validateField("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "admin-email-error" : undefined} placeholder="admin@example.com" className="h-12 rounded-xl border-[hsl(var(--site-border))] bg-[hsl(var(--site-input))] text-left focus-visible:ring-[hsl(var(--site-accent))]" required />
                {errors.email && <p id="admin-email-error" className="text-xs font-semibold text-[hsl(var(--site-danger-foreground))]">{errors.email}</p>}
              </div>

              <div className="mt-5 grid gap-2">
                <Label htmlFor="admin-password" className="text-[13px] font-extrabold">رمز عبور</Label>
                <div className="relative">
                  <Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" dir="ltr" value={values.password} onChange={update("password")} onBlur={() => validateField("password")} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "admin-password-error" : undefined} className="h-12 rounded-xl border-[hsl(var(--site-border))] bg-[hsl(var(--site-input))] pe-12 text-left focus-visible:ring-[hsl(var(--site-accent))]" required />
                  <button type="button" onClick={() => { setShowPassword((current) => !current); sound.playSound("toggle"); }} aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-[hsl(var(--site-muted))] transition hover:bg-[hsl(var(--site-muted)/.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--site-accent))]">
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
                {errors.password && <p id="admin-password-error" className="text-xs font-semibold text-[hsl(var(--site-danger-foreground))]">{errors.password}</p>}
              </div>

              <Button type="submit" disabled={loading} aria-busy={loading} className="mt-7 h-12 w-full rounded-xl bg-[hsl(var(--site-accent))] text-[15px] font-extrabold text-[hsl(var(--site-accent-foreground))] shadow-[0_12px_28px_hsl(var(--site-accent)/.22)] hover:bg-[hsl(var(--site-accent-strong))]">
                {loading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />در حال بررسی...</> : "ورود به پنل"}
              </Button>
              <p className="mt-5 text-center text-xs leading-6 text-[hsl(var(--site-muted))]">دسترسی این بخش فقط برای اعضای مجاز تیم است.</p>
            </div>
          </form>

          <div className="login-visual order-1 relative hidden min-h-0 overflow-hidden bg-[hsl(var(--site-brand-surface))] md:order-1 md:block">
            <Image src="/static/images/liara-admin-login-visual.png" alt="زیرساخت ابری و سرویس‌های لیارا" fill sizes="(max-width: 1024px) 50vw, 560px" className="object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--site-brand-surface)/.12)] via-transparent to-[hsl(var(--site-brand-surface)/.28)]" aria-hidden="true" />
            <div className="absolute inset-x-8 top-8 flex items-center justify-between">
              <Image src="/static/logo.svg" alt="لیارا" width={91} height={40} className="h-10 w-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
