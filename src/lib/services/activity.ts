import { store } from "../db/store";
import type { ActivityKind, Db } from "../types";
import { nowISO, uid } from "../utils";

/** The signed-in user performing an action; recorded for audit purposes. */
export interface Actor { id: string; name: string }

/** Append an audit entry inside an existing `store.update` draft. */
export function pushActivity(draft: Db, actor: Actor, kind: ActivityKind, text: string, refId?: string) {
  draft.activity.unshift({ id: uid("a"), at: nowISO(), userId: actor.id, userName: actor.name, kind, text, refId });
  if (draft.activity.length > 1000) draft.activity.length = 1000;
}

export function logActivity(actor: Actor, kind: ActivityKind, text: string, refId?: string) {
  store.update((d) => pushActivity(d, actor, kind, text, refId));
}
