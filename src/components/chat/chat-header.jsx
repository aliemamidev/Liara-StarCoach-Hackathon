
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Moon, Settings2, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export function ChatHeader({ onOpenSettings }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="chat-header">
      <div className="flex items-center gap-3">
        <Image
          src="/static/logo.svg"
          alt="نشان لیارا"
          width={84}
          height={36}
          className="h-9 w-auto"
        />
        <div>
          <p className="text-sm font-bold text-[hsl(var(--chat-text))]">لیا، دستیار هوش مصنوعی لیارا</p>
        </div>
      </div>

      <div className="chat-header-actions flex items-center gap-1">
        <TooltipProvider delayDuration={250}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="chat-header-action"
                aria-label={isDark ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تاریک"}
                aria-pressed={isDark}
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isDark ? "حالت روشن" : "حالت تاریک"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon" className="chat-header-action chat-header-docs-action" aria-label="باز کردن مستندات اصلی">
                <Link href="/documentation">
                  <BookOpen aria-hidden="true" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>مستندات اصلی</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="chat-header-action" aria-label="باز کردن تنظیمات" onClick={onOpenSettings}>
                <Settings2 size={19} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تنظیمات</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
