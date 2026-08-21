import { prisma } from "@/lib/prisma";

export const ADMIN_SETTINGS_ID = "default";

export const DEFAULT_ADMIN_SETTINGS = {
  captureUnknownTopics: true,
  notifyFailures: true,
  webSearchEnabled: true,
  probableAnswersEnabled: true,
  autoEscalationEnabled: true,
};

export async function getAdminSettings() {
  return prisma.adminSettings.upsert({
    where: { id: ADMIN_SETTINGS_ID },
    update: {},
    create: { id: ADMIN_SETTINGS_ID, ...DEFAULT_ADMIN_SETTINGS },
  });
}

export function serializeAdminSettings(settings) {
  return Object.fromEntries(Object.keys(DEFAULT_ADMIN_SETTINGS).map((key) => [key, Boolean(settings?.[key] ?? DEFAULT_ADMIN_SETTINGS[key])]));
}
