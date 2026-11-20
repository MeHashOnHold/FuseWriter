import { describe, expect, it } from "vitest";
import { Lru } from "./lru";

describe("Lru", () => {
  it("gets what was set", () => {
    const l = new Lru<number>(2);
    l.set("a", 1);
    expect(l.get("a")).toBe(1);
    expect(l.get("missing")).toBeUndefined();
  });

  it("evicts the oldest entry past the max", () => {
    const l = new Lru<number>(2);
    l.set("a", 1);
    l.set("b", 2);
    l.set("c", 3);
    expect(l.get("a")).toBeUndefined();
    expect(l.get("b")).toBe(2);
    expect(l.get("c")).toBe(3);
  });

  it("get refreshes recency", () => {
    const l = new Lru<number>(2);
    l.set("a", 1);
    l.set("b", 2);
    expect(l.get("a")).toBe(1);
    l.set("c", 3);
    expect(l.get("b")).toBeUndefined();
    expect(l.get("a")).toBe(1);
  });
});
