export interface Para {
  start: number;
  end: number; // exclusive
  text: string;
}

const MAX_PARA_CHARS = 5000;

interface Line {
  start: number; // offset of the first char of the line
  contentEnd: number; // offset just past the last content char (before \r?\n)
  next: number; // offset of the first char of the next line
  text: string; // line content without the newline (and without \r)
}

function linesOf(text: string): Line[] {
  const lines: Line[] = [];
  let pos = 0;
  while (pos <= text.length) {
    const nl = text.indexOf("\n", pos);
    const rawEnd = nl === -1 ? text.length : nl;
    const contentEnd = rawEnd > pos && text[rawEnd - 1] === "\r" ? rawEnd - 1 : rawEnd;
    lines.push({
      start: pos,
      contentEnd,
      next: nl === -1 ? text.length : nl + 1,
      text: text.slice(pos, contentEnd),
    });
    if (nl === -1) break;
    pos = nl + 1;
  }
  return lines;
}

/** Split one oversized block into chunks of at most 5000 chars, cutting
 * after the last sentence end or newline before the limit when possible. */
function chunkBlock(text: string, start: number, end: number, out: Para[]): void {
  let s = start;
  while (end - s > MAX_PARA_CHARS) {
    const limit = s + MAX_PARA_CHARS;
    const window = text.slice(s, limit);
    let cut = -1;
    for (const sep of [". ", "! ", "? ", "\n"]) {
      const idx = window.lastIndexOf(sep);
      if (idx > cut) cut = idx + sep.length;
    }
    if (cut <= 0) {
      const sp = window.lastIndexOf(" ");
      cut = sp > 0 ? sp + 1 : MAX_PARA_CHARS;
    }
    out.push({ start: s, end: s + cut, text: text.slice(s, s + cut) });
    s += cut;
  }
  if (s < end) out.push({ start: s, end, text: text.slice(s, end) });
}

/**
 * Split text into checkable paragraphs with exact offsets.
 * Paragraphs are separated by one or more blank lines. A fenced code
 * block is one paragraph even if it has blank lines inside. Paragraphs
 * longer than 5000 chars are chunked (see chunkBlock).
 */
export function splitParagraphs(text: string): Para[] {
  const out: Para[] = [];
  let blockStart = -1;
  let blockEnd = -1;
  let inFence = false;

  const flush = () => {
    if (blockStart >= 0) {
      const blockText = text.slice(blockStart, blockEnd);
      if (blockText.trim().length > 0) {
        chunkBlock(text, blockStart, blockEnd, out);
      }
    }
    blockStart = -1;
    blockEnd = -1;
  };

  for (const line of linesOf(text)) {
    const isFenceLine = line.text.startsWith("```");
    if (isFenceLine) inFence = !inFence;
    const blank = line.text.trim().length === 0;
    if (blank && !inFence && !isFenceLine) {
      flush();
      continue;
    }
    if (blockStart < 0) blockStart = line.start;
    blockEnd = line.contentEnd;
  }
  flush();
  return out;
}
