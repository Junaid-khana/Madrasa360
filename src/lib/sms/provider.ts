/**
 * SMS provider abstraction. The app never talks to a specific gateway directly:
 * it calls `getSmsProvider(settings.sms.provider).send(...)`.
 * To integrate a real gateway (e.g. a local Pakistani bulk-SMS API), implement `SmsProvider`
 * (ideally behind a server route so API keys stay off the client) and call `registerSmsProvider`.
 */
export interface SmsMessage { to: string; body: string; ref?: string }
export interface SmsResult { to: string; ok: boolean; providerMessageId?: string; error?: string }
export interface SmsContext { senderId: string; apiKey: string }

export interface SmsProvider {
  id: string;
  label: string;
  send(messages: SmsMessage[], ctx: SmsContext): Promise<SmsResult[]>;
}

/** Default: no real sending. Marks everything as delivered so workflows can be tested end-to-end. */
const simulation: SmsProvider = {
  id: "simulation",
  label: "Simulation (no SMS is actually sent)",
  async send(messages) {
    await new Promise((r) => setTimeout(r, 350));
    return messages.map((m, i) => ({ to: m.to, ok: true, providerMessageId: `SIM-${Date.now().toString(36)}-${i}` }));
  },
};

const notConfigured: SmsProvider = {
  id: "custom-http",
  label: "Custom HTTP gateway",
  async send(messages) {
    return messages.map((m) => ({ to: m.to, ok: false, error: "SMS gateway is not configured yet" }));
  },
};

const registry = new Map<string, SmsProvider>([[simulation.id, simulation], [notConfigured.id, notConfigured]]);
export const registerSmsProvider = (p: SmsProvider) => registry.set(p.id, p);
export const getSmsProvider = (settingId: string): SmsProvider =>
  settingId === "none" ? simulation : registry.get(settingId) ?? simulation;

/** GSM-7 messages hold 160 chars per part (153 when split); Urdu/Unicode holds 70 (67 when split). */
export function smsParts(text: string): { length: number; parts: number; unicode: boolean } {
  const unicode = /[^\x00-\x7F]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const length = text.length;
  return { length, unicode, parts: length <= single ? (length ? 1 : 0) : Math.ceil(length / multi) };
}
