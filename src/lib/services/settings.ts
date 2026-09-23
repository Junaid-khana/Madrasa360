import { store } from "../db/store";
import type { Settings } from "../types";
import { pushActivity, type Actor } from "./activity";

export function updateSettings(patch: Partial<Settings>, actor: Actor, label = "Settings updated") {
  store.update((d) => {
    d.settings = { ...d.settings, ...patch };
    pushActivity(d, actor, "settings", label);
  });
}
