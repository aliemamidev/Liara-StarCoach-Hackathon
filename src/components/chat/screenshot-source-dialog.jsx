import { AppWindow, Globe2, Monitor, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sources = {
  desktop: {
    label: "Desktop",
    description: "تمام صفحهٔ نمایش را به‌عنوان تصویر ثبت کن.",
    icon: Monitor,
  },
  window: {
    label: "Window",
    description: "فقط یک پنجرهٔ مشخص را انتخاب و ثبت کن.",
    icon: AppWindow,
  },
  browser: {
    label: "Browser Tab",
    description: "محتوای یک تب مرورگر را به‌صورت کامل ثبت کن.",
    icon: Globe2,
  },
};

export function ScreenshotSourceDialog({ open, onOpenChange, onContinue }) {
  const [source, setSource] = useState("desktop");

  useEffect(() => {
    if (open) setSource("desktop");
  }, [open]);

  const selectedSource = sources[source];
  const Icon = selectedSource.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="screenshot-source-dialog">
        <DialogHeader>
          <DialogTitle>منبع Screenshot را انتخاب کنید</DialogTitle>
          <DialogDescription>مشخص کنید تصویر از کدام بخش صفحه گرفته شود.</DialogDescription>
        </DialogHeader>
        <Tabs value={source} onValueChange={setSource} dir="ltr">
          <TabsList className="mt-5 grid w-full grid-cols-3">
            {Object.entries(sources).map(([value, item]) => (
              <TabsTrigger key={value} value={value}>{item.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={source} dir="rtl">
            <div className="screenshot-source-card">
              <div className="screenshot-source-icon"><Icon size={25} aria-hidden="true" /></div>
              <div>
                <h3>{selectedSource.label}</h3>
                <p>{selectedSource.description}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="screenshot-source-hint">بعد از ادامه، پنجرهٔ انتخاب امن مرورگر باز می‌شود.</div>
        <Button type="button" className="mt-5 w-full" onClick={() => onContinue(source)}>
          ادامه
          <ArrowLeft size={16} aria-hidden="true" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
