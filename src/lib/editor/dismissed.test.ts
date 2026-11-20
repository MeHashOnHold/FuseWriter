import { beforeEach, describe, expect, it } from "vitest";
import { clearDismissed, dismiss, dismissKey, isDismissed } from "./dismissed";
import { makeMark } from "./testHelpers";

describe("dismissed", () => {
  beforeEach(() => clearDismissed());

  it("dismissKey combines kind, original, replacement, reason", () => {
    const s = makeMark({ start: 0, end: 3 });
    expect(dismissKey(s)).toBe("spelling|teh|the|Did you mean the?");
  });

  it("a dismissed suggestion reports dismissed; others do not", () => {
    const a = makeMark({ start: 0, end: 3 });
    const b = makeMark({ start: 5, end: 8, original: "recieve", replacement: "receive" });
    expect(isDismissed(a)).toBe(false);
    dismiss(a);
    expect(isDismissed(a)).toBe(true);
    expect(isDismissed(b)).toBe(false);
  });

  it("the same suggestion at a different position is still dismissed", () => {
    dismiss(makeMark({ start: 0, end: 3 }));
    expect(isDismissed(makeMark({ start: 20, end: 23 }))).toBe(true);
  });

  it("clearDismissed resets the set", () => {
    const a = makeMark({ start: 0, end: 3 });
    dismiss(a);
    clearDismissed();
    expect(isDismissed(a)).toBe(false);
  });
});
