let cuelumePromise;

function loadCuelume() {
  if (typeof window === "undefined") return Promise.resolve(null);
  cuelumePromise ??= import("cuelume");
  return cuelumePromise;
}

export async function syncSoundEnabled(enabled) {
  const cuelume = await loadCuelume();
  cuelume?.setEnabled(enabled);
}

export async function playUiSound(name = "chime") {
  const cuelume = await loadCuelume();
  cuelume?.play(name, { volume: 0.35 });
}

export async function bindUiSounds() {
  const cuelume = await loadCuelume();
  cuelume?.bind(document);
}
