import { useCallback, useEffect, useState } from "react";
import { bindUiSounds, playUiSound, syncSoundEnabled } from "@/lib/sound";

const STORAGE_KEY = "liara-ui-sound-enabled";

export function useUiSound() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next = stored !== "false";
    setEnabled(next);
    syncSoundEnabled(next);
    bindUiSounds();
  }, []);

  const updateEnabled = useCallback((next) => {
    setEnabled(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
    syncSoundEnabled(next);
  }, []);

  const playSound = useCallback(
    (name) => {
      if (enabled) playUiSound(name);
    },
    [enabled],
  );

  return { enabled, setEnabled: updateEnabled, playSound };
}
