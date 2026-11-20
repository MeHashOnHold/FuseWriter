import { aiComplete } from "../ipc";
import { settings } from "../settings/store.svelte";
import { AiError, type AiProvider } from "./types";
import type { AiRequest } from "../types";

/** App-registered consent prompt (M4-T10). Returns true when the user
 * allows sending text to the host; the handler also records consent. */
export type ConsentHandler = (host: string) => Promise<boolean>;

let consentHandler: ConsentHandler | undefined;

export function setConsentHandler(handler: ConsentHandler | undefined): void {
  consentHandler = handler;
}

export function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

export class CloudProvider implements AiProvider {
  readonly id = "cloud" as const;
  readonly sendsTextOffDevice = true;
  readonly label: string;
  readonly host: string;

  constructor(baseUrl: string) {
    this.host = hostOf(baseUrl);
    this.label = this.host;
  }

  async complete(
    req: Omit<AiRequest, "engine">,
    handlers: { onToken?: (t: string) => void },
    signal: AbortSignal,
  ): Promise<string> {
    if (!settings.cloud.consentHosts.includes(this.host)) {
      const allowed = consentHandler ? await consentHandler(this.host) : false;
      if (!allowed) {
        throw new AiError(
          "consent_required",
          "Permission is needed before sending text to this server.",
        );
      }
    }
    return aiComplete({ ...req, engine: "cloud" }, handlers.onToken, signal);
  }
}
