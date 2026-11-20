/** Word-level diff via token LCS (Plan.md M5-T01). */

export type Op = { type: "equal" | "delete" | "insert"; text: string };

const TOKEN_RE = /\s+|[\p{L}\p{N}_'’-]+|[^\s\p{L}\p{N}_]/gu;

export function tokenize(s: string): string[] {
  return s.match(TOKEN_RE) ?? [];
}

const MAX_CELLS = 4_000_000;

export function wordDiff(a: string, b: string): Op[] {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const n = ta.length;
  const m = tb.length;
  if (n * m > MAX_CELLS) {
    const ops: Op[] = [];
    if (a) ops.push({ type: "delete", text: a });
    if (b) ops.push({ type: "insert", text: b });
    return ops;
  }
  // dp[i*(m+1)+j] = LCS length of ta[i..] and tb[j..]
  const width = m + 1;
  const dp = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * width + j] =
        ta[i] === tb[j]
          ? dp[(i + 1) * width + j + 1] + 1
          : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
    }
  }
  const raw: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ta[i] === tb[j]) {
      raw.push({ type: "equal", text: ta[i]! });
      i++;
      j++;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
      raw.push({ type: "delete", text: ta[i]! });
      i++;
    } else {
      raw.push({ type: "insert", text: tb[j]! });
      j++;
    }
  }
  while (i < n) raw.push({ type: "delete", text: ta[i++]! });
  while (j < m) raw.push({ type: "insert", text: tb[j++]! });

  const merged: Op[] = [];
  for (const op of raw) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) last.text += op.text;
    else merged.push({ ...op });
  }
  return merged;
}
