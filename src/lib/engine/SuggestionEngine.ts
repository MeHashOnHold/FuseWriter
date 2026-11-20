import { hashText } from "./hash";
import { Lru } from "./lru";
import { splitParagraphs } from "./paragraphs";
import type { Dialect, RawSuggestion, Suggestion } from "../types";

export interface EditorHost {
  getText(): string;
  applyMarks(u: { from: number; to: number; group: "harper" | "ai"; marks: Suggestion[] }): void;
}

export interface EngineDeps {
  checkText(text: string, dialect: Dialect): Promise<RawSuggestion[]>;
  dialect(): Dialect;
  isDismissed(s: Suggestion): boolean;
  /** Called once per session when a check fails (M8-T02). */
  onError?: () => void;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

const DEBOUNCE_MS = 100;
const MAX_IN_FLIGHT = 4;
const CACHE_MAX = 500;

/**
 * Runs Harper checks per paragraph: 100 ms debounce, hash cache,
 * at most 4 checks in flight, stale results discarded (a result is
 * applied only if a paragraph with the same hash still exists).
 */
export class SuggestionEngine {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private cache = new Lru<RawSuggestion[]>(CACHE_MAX);
  private inFlight = 0;
  private waiters: Array<() => void> = [];
  private disposed = false;
  private errorReported = false;
  private lastDialect: Dialect;

  constructor(
    private host: EditorHost,
    private deps: EngineDeps,
  ) {
    this.lastDialect = deps.dialect();
  }

  onDocChanged(): void {
    if (this.disposed) return;
    this.clearTimer();
    const setFn = this.deps.setTimeoutFn ?? setTimeout;
    this.timer = setFn(() => {
      void this.run();
    }, DEBOUNCE_MS);
  }

  checkAllNow(): void {
    if (this.disposed) return;
    this.clearTimer();
    void this.run();
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      const clearFn = this.deps.clearTimeoutFn ?? clearTimeout;
      clearFn(this.timer);
      this.timer = undefined;
    }
  }

  private async run(): Promise<void> {
    const dialect = this.deps.dialect();
    if (dialect !== this.lastDialect) {
      this.cache.clear();
      this.lastDialect = dialect;
    }
    const paras = splitParagraphs(this.host.getText());
    await Promise.all(paras.map((p) => this.checkParagraph(p.text)));
  }

  private async checkParagraph(paraText: string): Promise<void> {
    const h = hashText(paraText);
    let raws = this.cache.get(h);
    if (!raws) {
      await this.acquire();
      try {
        raws = await this.deps.checkText(paraText, this.deps.dialect());
      } catch {
        if (!this.errorReported) {
          this.errorReported = true;
          this.deps.onError?.();
        }
        return; // IPC errors: leave existing marks alone.
      } finally {
        this.release();
      }
      this.cache.set(h, raws);
    }
    if (this.disposed) return;
    // Re-split the CURRENT text: apply only if this paragraph still exists.
    const match = splitParagraphs(this.host.getText()).find((p) => hashText(p.text) === h);
    if (!match) return;
    const marks: Suggestion[] = raws
      .map((r) => ({
        id: `harper:${r.kind}:${match.start + r.start}:${match.start + r.end}:${hashText(r.original + "->" + r.replacement)}`,
        start: match.start + r.start,
        end: match.start + r.end,
        original: r.original,
        replacement: r.replacement,
        alternatives: r.alternatives,
        source: "harper" as const,
        kind: r.kind,
        reason: r.reason,
        safeToAutoApply: r.safeToAutoApply,
      }))
      .filter((s) => !this.deps.isDismissed(s));
    this.host.applyMarks({ from: match.start, to: match.end, group: "harper", marks });
  }

  private acquire(): Promise<void> {
    if (this.inFlight < MAX_IN_FLIGHT) {
      this.inFlight++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(() => {
        this.inFlight++;
        resolve();
      });
    });
  }

  private release(): void {
    this.inFlight--;
    const next = this.waiters.shift();
    if (next) next();
  }
}
