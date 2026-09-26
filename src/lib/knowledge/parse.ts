/**
 * Turn an uploaded CSV / TXT into plain transcript text.
 * Handles the common shapes: one utterance per row (speaker + text columns), one call per row
 * (a transcript column), or anything else (cells joined). No external deps.
 */

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

const SPEAKER_COLS = ["speaker", "role", "name", "participant", "from", "who"];
const TEXT_COLS = ["text", "message", "utterance", "content", "transcript_text", "sentence", "line"];
const TRANSCRIPT_COLS = ["transcript", "transcription", "call_transcript", "body", "notes"];
const CALL_ID_COLS = ["call_id", "conversation_id", "id", "call", "recording"];

function findCol(headers: string[], candidates: string[]) {
  const idx = headers.findIndex((h) => candidates.includes(h));
  return idx === -1 ? null : idx;
}

export function csvToTranscriptText(csv: string): string {
  const rows = parseCsv(csv);
  if (rows.length < 2) return csv;
  const headers = rows[0]!.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const body = rows.slice(1);

  const transcriptCol = findCol(headers, TRANSCRIPT_COLS);
  if (transcriptCol != null) {
    return body
      .map((r, i) => `--- Call ${i + 1} ---\n${(r[transcriptCol] ?? "").trim()}`)
      .filter((s) => s.length > 15)
      .join("\n\n");
  }

  const textCol = findCol(headers, TEXT_COLS);
  if (textCol != null) {
    const speakerCol = findCol(headers, SPEAKER_COLS);
    const callCol = findCol(headers, CALL_ID_COLS);
    let lastCall: string | null = null;
    let callN = 0;
    const out: string[] = [];
    for (const r of body) {
      const call = callCol != null ? (r[callCol] ?? "") : "";
      if (callCol != null && call !== lastCall) {
        callN += 1;
        out.push(`${out.length ? "\n" : ""}--- Call ${callN} ---`);
        lastCall = call;
      }
      const speaker = speakerCol != null ? (r[speakerCol] ?? "").trim() : "";
      const text = (r[textCol] ?? "").trim();
      if (text) out.push(speaker ? `${speaker}: ${text}` : text);
    }
    return out.join("\n");
  }

  return body.map((r) => r.filter((c) => c.trim()).join(" | ")).join("\n");
}

export function fileToText(name: string, content: string) {
  return name.toLowerCase().endsWith(".csv") ? csvToTranscriptText(content) : content;
}
