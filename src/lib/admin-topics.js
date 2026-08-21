export const ADMIN_TOPICS = [
  { id: "deployment", label: "استقرار و پلتفرم", pattern: /deploy|استقرار|دیپلوی|پلتفرم|اپلیکیشن|runtime|node/i },
  { id: "ai", label: "هوش مصنوعی", pattern: /هوش مصنوعی|مدل|چت‌?بات|prompt|پرامپت|توکن|openai|ai/i },
  { id: "infrastructure", label: "سرور و زیرساخت", pattern: /سرور|زیرساخت|vps|docker|کانتینر|linux|لینوکس|cpu|memory|رم/i },
  { id: "database", label: "دیتابیس", pattern: /database|دیتابیس|پایگاه داده|postgres|mysql|mongodb|redis|sql/i },
  { id: "storage", label: "ذخیره‌سازی", pattern: /ذخیره‌?سازی|storage|object storage|بکاپ|backup|فایل/i },
  { id: "network", label: "دامنه و شبکه", pattern: /dns|دامنه|domain|شبکه|cdn|ssl|tls|cors|502|ip|پورت/i },
  { id: "email", label: "ایمیل", pattern: /ایمیل|email|mail|smtp/i },
  { id: "api-cli", label: "API و CLI", pattern: /api|sdk|cli|curl|http|graphql/i },
  { id: "account-team", label: "حساب و تیم", pattern: /حساب|کاربر|تیم|عضو|ورود|رمز|دسترسی|account|team/i },
  { id: "billing", label: "صورتحساب", pattern: /هزینه|صورتحساب|فاکتور|قیمت|پلن|billing|invoice/i },
  { id: "monitoring", label: "پایش و خطا", pattern: /لاگ|log|پایش|monitor|خطا|ارور|error|هشدار/i },
  { id: "ready-apps", label: "برنامه‌های آماده", pattern: /برنامه آماده|قالب|وردپرس|wordpress|ready app/i },
  { id: "uncategorized", label: "نیازمند دسته‌بندی", pattern: null },
];

export function topicFor(text) {
  const match = ADMIN_TOPICS.find((topic) => topic.pattern?.test(String(text || "")));
  return match || ADMIN_TOPICS[ADMIN_TOPICS.length - 1];
}
