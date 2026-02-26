import { describe, expect, it } from "vitest";
import { toMarkdown } from "./convert.js";

describe("toMarkdown", () => {
  it("converts headings to ATX style", () => {
    const md = toMarkdown("<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>");
    expect(md).toContain("# Title");
    expect(md).toContain("## Subtitle");
    expect(md).toContain("### Section");
  });

  it("converts tables to GFM pipe tables", () => {
    const html = `<table>
      <thead><tr><th>Name</th><th>Age</th></tr></thead>
      <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
    </table>`;
    const md = toMarkdown(html);
    expect(md).toContain("| Name | Age |");
    expect(md).toContain("| Alice | 30 |");
  });

  it("converts fenced code blocks with language hint", () => {
    const html = '<pre><code class="language-js">const x = 1;</code></pre>';
    const md = toMarkdown(html);
    expect(md).toContain("```js");
    expect(md).toContain("const x = 1;");
    expect(md).toContain("```");
  });

  it("converts nested lists", () => {
    const html = "<ul><li>A<ul><li>B</li><li>C</li></ul></li><li>D</li></ul>";
    const md = toMarkdown(html);
    expect(md).toMatch(/-\s+A/);
    expect(md).toMatch(/-\s+B/);
    expect(md).toMatch(/-\s+D/);
  });

  it("converts links", () => {
    const md = toMarkdown('<a href="https://example.com">Link</a>');
    expect(md).toContain("[Link](https://example.com)");
  });

  it("strips empty links", () => {
    const md = toMarkdown('<a href="">click</a> and <a href="https://x.com"></a>');
    expect(md).not.toContain("[");
  });

  it("collapses excessive blank lines", () => {
    const html = "<p>A</p><br><br><br><br><br><p>B</p>";
    const md = toMarkdown(html);
    // Should not have more than 2 consecutive newlines
    expect(md).not.toMatch(/\n{3,}/);
  });

  it("ends with a single newline", () => {
    const md = toMarkdown("<p>Hello</p>");
    expect(md).toMatch(/[^\n]\n$/);
  });
});
