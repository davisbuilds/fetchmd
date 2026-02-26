export interface Stats {
  words: number;
  tokens: number;
  bytes: number;
}

export function computeStats(text: string): Stats {
  const words = text.split(/\s+/).filter(Boolean).length;
  const bytes = Buffer.byteLength(text, "utf-8");
  const tokens = Math.ceil(bytes / 4);
  return { words, tokens, bytes };
}

export function formatStats({ words, tokens, bytes }: Stats): string {
  const size =
    bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(1)} KB`;
  return `${words.toLocaleString("en-US")} words | ~${tokens.toLocaleString("en-US")} tokens | ${size} markdown`;
}
