import { describe, expect, it } from "vitest";
import { tokenize, wordDiff, type Op } from "./wordDiff";

function join(ops: Op[], types: Op["type"][]): string {
  return ops
    .filter((o) => types.includes(o.type))
    .map((o) => o.text)
    .join("");
}

describe("tokenize", () => {
  it("joining tokens gives back the input exactly", () => {
    for (const s of ["", "hello world", "don't stop—now!", "café  naïve\t2.0", "[[P1]] x"]) {
      expect(tokenize(s).join("")).toBe(s);
    }
  });
});

describe("wordDiff", () => {
  it("identical strings give one equal op", () => {
    expect(wordDiff("the cat sat", "the cat sat")).toEqual([
      { type: "equal", text: "the cat sat" },
    ]);
  });

  it("one word replaced", () => {
    const ops = wordDiff("the cat sat", "the dog sat");
    expect(join(ops, ["equal", "delete"])).toBe("the cat sat");
    expect(join(ops, ["equal", "insert"])).toBe("the dog sat");
    expect(ops.some((o) => o.type === "delete" && o.text === "cat")).toBe(true);
    expect(ops.some((o) => o.type === "insert" && o.text === "dog")).toBe(true);
  });

  it("insertion at the end", () => {
    const ops = wordDiff("hello", "hello world");
    expect(ops[ops.length - 1]).toEqual({ type: "insert", text: " world" });
  });

  it("deletion at the start", () => {
    const ops = wordDiff("big cat", "cat");
    expect(ops[0]).toEqual({ type: "delete", text: "big " });
  });

  it("empty vs text and both empty", () => {
    expect(wordDiff("", "hello")).toEqual([{ type: "insert", text: "hello" }]);
    expect(wordDiff("hello", "")).toEqual([{ type: "delete", text: "hello" }]);
    expect(wordDiff("", "")).toEqual([]);
  });

  it("unicode words diff as whole tokens", () => {
    const ops = wordDiff("café naïve", "café résumé");
    expect(join(ops, ["equal", "delete"])).toBe("café naïve");
    expect(join(ops, ["equal", "insert"])).toBe("café résumé");
  });

  it("reconstruction property on 20 deterministic pairs", () => {
    let seed = 42;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const vocab = ["the", "cat", "sat", "on", "a", "mat", "dog", "runs", "fast", "café"];
    for (let k = 0; k < 20; k++) {
      const mk = () =>
        Array.from({ length: 1 + rand(8) }, () => vocab[rand(vocab.length)]).join(" ");
      const a = mk();
      const b = mk();
      const ops = wordDiff(a, b);
      expect(join(ops, ["equal", "delete"])).toBe(a);
      expect(join(ops, ["equal", "insert"])).toBe(b);
    }
  });

  it("falls back for huge inputs", () => {
    const a = Array.from({ length: 2100 }, (_, i) => `w${i}`).join(" ");
    const b = Array.from({ length: 2100 }, (_, i) => `x${i}`).join(" ");
    const ops = wordDiff(a, b);
    expect(ops).toEqual([
      { type: "delete", text: a },
      { type: "insert", text: b },
    ]);
  });
});
