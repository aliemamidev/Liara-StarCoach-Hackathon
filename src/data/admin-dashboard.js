export const adminNavItems = [
  { id: "dashboard", label: "داشبورد", caption: "نمای کلی سیستم", icon: "LayoutDashboard" },
  { id: "messages", label: "پیام‌ها", caption: "مرور تعاملات", icon: "MessagesSquare" },
  { id: "unanswered", label: "پرسش‌های بی‌پاسخ", caption: "نیازمند بررسی", icon: "CircleHelp" },
  { id: "escalations", label: "ارجاع‌های ادمین", caption: "صف بررسی انسانی", icon: "Inbox" },
  { id: "brain", label: "مغز من", caption: "دانش تأییدشده Lia", icon: "Brain" },
  { id: "analytics", label: "تحلیل‌ها", caption: "الگوهای رفتاری", icon: "ChartNoAxesCombined" },
  { id: "users", label: "کاربران", caption: "اعضای فعال", icon: "Users" },
  { id: "settings", label: "تنظیمات", caption: "کنترل پنل", icon: "Settings2" },
];

export const adminPageMeta = {
  dashboard: {
    eyebrow: "",
    title: "سلام، سارا",
    description: "این‌جا تصویری زنده از رفتار کاربران و سلامت دستیار هوشمند را می‌بینید.",
  },
  messages: {
    eyebrow: "مرور تعاملات",
    title: "پیام‌های کاربران",
    description: "مکالمه‌ها را جستجو کنید و پاسخ‌هایی را که نیازمند بازبینی هستند پیدا کنید.",
  },
  unanswered: {
    eyebrow: "",
    title: "پرسش‌های بی‌پاسخ",
    description: "موضوعاتی که دانش فعلی دستیار پوشش نمی‌دهد، این‌جا اولویت‌بندی شده‌اند.",
  },
  escalations: {
    eyebrow: "پشتیبانی انسانی",
    title: "ارجاع‌های ادمین",
    description: "پرسش‌هایی را که منابع موجود پوشش نداده‌اند بررسی و پاسخ دهید.",
  },
  brain: {
    eyebrow: "دانش تأییدشده Lia",
    title: "مغز من",
    description: "پاسخ‌های تأییدشده را ویرایش کنید تا در پاسخ‌های بعدی قابل استفاده باشند.",
  },
  analytics: {
    eyebrow: "تصمیم‌گیری داده‌محور",
    title: "تحلیل رفتار کاربران",
    description: "روند پیام‌ها، موضوعات پرتکرار و نقاط اصطکاک را در یک نگاه ببینید.",
  },
  users: {
    eyebrow: "جامعه کاربران",
    title: "کاربران فعال",
    description: "ریتم استفاده و آخرین فعالیت اعضای سیستم را بررسی کنید.",
  },
  settings: {
    eyebrow: "",
    title: "تنظیمات مانیتورینگ",
    description: "رفتار لیا و اعلان‌های مانیتورینگ را مدیریت کنید.",
  },
};

export const kpis = [
  { id: "messages", label: "کل پیام‌ها", value: "۲۸٬۴۶۰", change: "+۱۲٫۸٪", note: "در ۳۰ روز گذشته", tone: "blue", trend: [38, 44, 42, 52, 49, 62, 70, 68, 82] },
  { id: "users", label: "کاربران فعال", value: "۱٬۲۴۸", change: "+۸٫۴٪", note: "کاربر یکتا در ماه", tone: "teal", trend: [28, 34, 32, 44, 48, 45, 58, 63, 72] },
  { id: "unanswered", label: "بدون پاسخ مناسب", value: "۱۸۶", change: "-۴٫۲٪", note: "در صف بررسی", tone: "orange", trend: [68, 60, 64, 58, 51, 54, 42, 38, 32] },
  { id: "failures", label: "درخواست ناموفق", value: "۴۲", change: "+۱٫۸٪", note: "نیازمند پایش", tone: "red", trend: [25, 30, 26, 32, 29, 40, 35, 46, 42] },
];

export const messageRows = [
  { id: "msg-2048", user: "مهدی رضایی", initials: "مر", question: "چطور برای اپلیکیشن Node.js دیپلوی خودکار بسازم؟", topic: "استقرار اپلیکیشن", status: "answered", statusLabel: "پاسخ مناسب", time: "امروز، ۱۰:۴۲", channel: "چت وب", response: "برای ساخت استقرار خودکار، ابتدا پروژه را به گیت متصل کنید و سپس یک فرآیند CI/CD روی شاخه اصلی تعریف کنید." },
  { id: "msg-2047", user: "نگار محمدی", initials: "نم", question: "تفاوت دیسک SSD و Object Storage برای بکاپ چیست؟", topic: "فضای ذخیره‌سازی", status: "review", statusLabel: "نیازمند بررسی", time: "امروز، ۱۰:۲۶", channel: "چت وب", response: "تفاوت دقیق این دو سرویس در منابع فعلی پیدا نشد و پاسخ عمومی ارائه شد." },
  { id: "msg-2046", user: "امیرحسین کریمی", initials: "ا‍ک", question: "خطای 502 بعد از تغییر DNS را چطور رفع کنم؟", topic: "دامنه و DNS", status: "answered", statusLabel: "پاسخ مناسب", time: "امروز، ۰۹:۵۴", channel: "چت وب", response: "ابتدا پراکسی را بررسی کنید، سپس انتشار DNS و سلامت سرویس مقصد را با curl تست کنید." },
  { id: "msg-2045", user: "سارا احمدی", initials: "س‌ا", question: "چرا هزینه این ماه من ناگهان دو برابر شده؟", topic: "هزینه و صورتحساب", status: "review", statusLabel: "نیازمند بررسی", time: "امروز، ۰۹:۳۲", channel: "موبایل", response: "جزئیات مصرف حساب برای پاسخ دقیق در دسترس نیست؛ درخواست به تیم مالی ارجاع شد." },
  { id: "msg-2044", user: "کیان نادری", initials: "ک‌ن", question: "آیا امکان اتصال Redis با TLS وجود دارد؟", topic: "پایگاه داده", status: "answered", statusLabel: "پاسخ مناسب", time: "امروز، ۰۹:۱۸", channel: "چت وب", response: "بله، در تنظیمات اتصال Redis گواهی CA را اضافه کرده و اتصال امن را فعال کنید." },
  { id: "msg-2043", user: "رها موسوی", initials: "ر‌م", question: "یک سرویس ناشناخته در فاکتور من دیده می‌شود.", topic: "موضوع ناشناخته", status: "failed", statusLabel: "خطای پاسخ", time: "امروز، ۰۸:۴۷", channel: "API", response: "سرویس موردنظر در داده‌های قابل دسترس دستیار پیدا نشد." },
  { id: "msg-2042", user: "پارسا توکلی", initials: "پ‌ت", question: "چطور لاگ‌های کانتینر را فقط برای ۷ روز نگه دارم؟", topic: "پایش و لاگ", status: "answered", statusLabel: "پاسخ مناسب", time: "دیروز، ۲۳:۵۹", channel: "چت وب", response: "سیاست نگه‌داری لاگ را روی ۷ روز تنظیم کنید و برای کاهش حجم، چرخش لاگ را فعال نگه دارید." },
];

export const adminNotifications = [
  { id: "notif-2048", title: "مکالمه جدید برای بررسی", description: "پاسخ مربوط به استقرار اپلیکیشن نیازمند بازبینی است.", time: "همین حالا", messageId: "msg-2048", read: false },
  { id: "notif-2047", title: "پاسخ احتمالی ثبت شد", description: "یک پاسخ عمومی درباره فضای ذخیره‌سازی ثبت شده است.", time: "۱۲ دقیقه پیش", messageId: "msg-2047", read: false },
  { id: "notif-2046", title: "مکالمه پاسخ داده شد", description: "پرسش مربوط به خطای ۵۰۲ پاسخ داده شد.", time: "۴۵ دقیقه پیش", messageId: "msg-2046", read: true },
];

export const unknownTopics = [
  { id: "topic-01", title: "محاسبه هزینه سرویس ناشناخته", count: "۳۸", lastSeen: "۲ ساعت پیش", severity: "high", examples: ["این آیتم در فاکتور من چیست؟", "هزینه سرویس X از کجا آمده؟"] },
  { id: "topic-02", title: "اتصال سرویس به شبکه خصوصی", count: "۲۷", lastSeen: "۵ ساعت پیش", severity: "medium", examples: ["آیا سرویس من به VPC وصل می‌شود؟", "ارتباط داخلی بین دو اپلیکیشن"] },
  { id: "topic-03", title: "محدودیت‌های استقرار مدل AI", count: "۱۹", lastSeen: "دیروز", severity: "medium", examples: ["کدام مدل‌ها روی GPU اجرا می‌شوند؟", "محدودیت حافظه مدل سفارشی"] },
  { id: "topic-04", title: "بازیابی حساب و مالکیت تیم", count: "۱۴", lastSeen: "۲ روز پیش", severity: "low", examples: ["مالک تیم به حساب دسترسی ندارد", "بازیابی دسترسی ادمین"] },
];

export const weeklyMessages = [
  { day: "شنبه", value: 62 },
  { day: "یکشنبه", value: 78 },
  { day: "دوشنبه", value: 68 },
  { day: "سه‌شنبه", value: 86 },
  { day: "چهارشنبه", value: 74 },
  { day: "پنجشنبه", value: 92 },
  { day: "جمعه", value: 81 },
];

export const topics = [
  { label: "استقرار اپلیکیشن", count: "۶٬۴۸۰", percentage: 82, tone: "blue" },
  { label: "پایگاه داده", count: "۴٬۲۱۰", percentage: 64, tone: "teal" },
  { label: "دامنه و DNS", count: "۳٬۸۹۰", percentage: 58, tone: "purple" },
  { label: "هزینه و صورتحساب", count: "۲٬۷۸۰", percentage: 44, tone: "orange" },
  { label: "پایش و لاگ", count: "۱٬۹۳۰", percentage: 31, tone: "slate" },
];

export const activeUsers = [
  { name: "مهدی رضایی", initials: "مر", email: "mehdi.r@example.com", messages: "۱۸۴", lastActive: "امروز، ۱۰:۴۲", plan: "Pro", tone: "blue" },
  { name: "نگار محمدی", initials: "نم", email: "negar.m@example.com", messages: "۱۴۲", lastActive: "امروز، ۱۰:۲۶", plan: "Team", tone: "purple" },
  { name: "امیرحسین کریمی", initials: "ا‍ک", email: "amir.k@example.com", messages: "۱۲۶", lastActive: "امروز، ۰۹:۵۴", plan: "Pro", tone: "teal" },
  { name: "سارا احمدی", initials: "س‌ا", email: "sara.a@example.com", messages: "۹۸", lastActive: "امروز، ۰۹:۳۲", plan: "Starter", tone: "orange" },
  { name: "کیان نادری", initials: "ک‌ن", email: "kian.n@example.com", messages: "۸۶", lastActive: "امروز، ۰۹:۱۸", plan: "Team", tone: "red" },
];

export const problemSignals = [
  { label: "پاسخ‌های عمومی و کم‌دقت", value: "۴۶٪", progress: 46, description: "از موارد نیازمند بازبینی", tone: "orange" },
  { label: "ارجاع به منبع ناموجود", value: "۲۸٪", progress: 28, description: "در پرسش‌های بی‌پاسخ", tone: "red" },
  { label: "ابهام در نیت کاربر", value: "۱۷٪", progress: 17, description: "نیازمند سؤال تکمیلی", tone: "purple" },
];
