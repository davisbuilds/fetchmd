import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    hr: "---",
  });

  td.use(gfm);

  // Strip empty links
  td.addRule("stripEmptyLinks", {
    filter: (node) => {
      return node.nodeName === "A" && (!node.getAttribute("href") || !node.textContent?.trim());
    },
    replacement: () => "",
  });

  // Strip decorative/tracking images
  td.addRule("stripTrackingImages", {
    filter: (node) => {
      if (node.nodeName !== "IMG") return false;
      const width = node.getAttribute("width");
      const height = node.getAttribute("height");
      const src = node.getAttribute("src") || "";
      if (width === "1" && height === "1") return true;
      if (src.includes("spacer.gif") || src.includes("pixel.gif")) return true;
      return false;
    },
    replacement: () => "",
  });

  // Preserve language hint on fenced code blocks
  td.addRule("fencedCodeWithLang", {
    filter: (node) => {
      return (
        node.nodeName === "PRE" && node.firstChild !== null && node.firstChild.nodeName === "CODE"
      );
    },
    replacement: (_content, node) => {
      const code = node.firstChild as HTMLElement;
      const className = code.getAttribute("class") || "";
      const langMatch = className.match(/(?:language-|lang-)(\S+)/);
      const lang = langMatch ? langMatch[1] : "";
      const text = code.textContent || "";
      return `\n\n\`\`\`${lang}\n${text.replace(/\n$/, "")}\n\`\`\`\n\n`;
    },
  });

  return td;
}

function postProcess(md: string): string {
  return `${md
    // Trim trailing whitespace from each line (must run before blank line collapse)
    .replace(/[^\S\n]+$/gm, "")
    // Collapse 3+ consecutive blank lines to 2
    .replace(/\n{3,}/g, "\n\n")
    // Ensure single trailing newline
    .trimEnd()}\n`;
}

export function toMarkdown(html: string): string {
  const td = createTurndown();
  const raw = td.turndown(html);
  return postProcess(raw);
}
