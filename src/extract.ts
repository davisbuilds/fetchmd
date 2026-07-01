import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export interface ExtractResult {
  title: string;
  content: string;
  excerpt?: string;
}

export function extractContent(
  html: string,
  url?: string,
  onWarn?: (message: string) => void,
): ExtractResult {
  if (!html || html.trim().length === 0) {
    throw new Error("Cannot extract content from empty HTML.");
  }

  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  const reader = new Readability(doc);
  const article = reader.parse();

  if (article?.content) {
    return {
      title: article.title || "",
      content: article.content,
      excerpt: article.excerpt || undefined,
    };
  }

  // Fallback: use body content
  const body = doc.body;
  if (!body?.innerHTML.trim()) {
    throw new Error("No extractable content found in HTML.");
  }

  const title = doc.title || "";
  onWarn?.("readability extraction failed, using full body");

  return {
    title,
    content: body.innerHTML,
  };
}
