import { describe, expect, it } from "vitest";
import { SecurityError, validateUrl } from "./security.js";

const publicDns = async () => ({ address: "93.184.216.34" });

describe("validateUrl", () => {
  it("accepts a valid HTTPS URL", async () => {
    const url = await validateUrl("https://example.com", { dnsLookup: publicDns });
    expect(url.href).toBe("https://example.com/");
  });

  it("rejects HTTP URLs", async () => {
    await expect(validateUrl("http://example.com")).rejects.toThrow(SecurityError);
  });

  it("rejects file:// URLs", async () => {
    await expect(validateUrl("file:///etc/passwd")).rejects.toThrow(SecurityError);
  });

  it("rejects ftp:// URLs", async () => {
    await expect(validateUrl("ftp://example.com")).rejects.toThrow(SecurityError);
  });

  it("rejects invalid URL strings", async () => {
    await expect(validateUrl("not-a-url")).rejects.toThrow(SecurityError);
  });

  it("rejects localhost", async () => {
    await expect(validateUrl("https://localhost")).rejects.toThrow(SecurityError);
  });

  it("rejects 127.0.0.1", async () => {
    await expect(validateUrl("https://127.0.0.1")).rejects.toThrow(SecurityError);
  });

  it("rejects 10.x.x.x", async () => {
    await expect(validateUrl("https://10.0.0.1")).rejects.toThrow(SecurityError);
  });

  it("rejects 192.168.x.x", async () => {
    await expect(validateUrl("https://192.168.1.1")).rejects.toThrow(SecurityError);
  });

  it("rejects 172.16-31.x.x", async () => {
    await expect(validateUrl("https://172.16.0.1")).rejects.toThrow(SecurityError);
    await expect(validateUrl("https://172.31.255.255")).rejects.toThrow(SecurityError);
  });

  it("rejects 169.254.x.x (link-local)", async () => {
    await expect(validateUrl("https://169.254.1.1")).rejects.toThrow(SecurityError);
  });

  it("rejects IPv6 loopback [::1]", async () => {
    await expect(validateUrl("https://[::1]")).rejects.toThrow(SecurityError);
  });

  it("rejects hostnames that resolve to private IPs", async () => {
    const privateDns = async () => ({ address: "192.168.1.100" });
    await expect(
      validateUrl("https://evil.example.com", { dnsLookup: privateDns }),
    ).rejects.toThrow(SecurityError);
  });

  it("rejects hostnames that fail to resolve", async () => {
    const failDns = async () => {
      throw new Error("ENOTFOUND");
    };
    await expect(
      validateUrl("https://nonexistent.invalid", { dnsLookup: failDns }),
    ).rejects.toThrow(SecurityError);
  });
});
