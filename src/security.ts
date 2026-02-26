import { promises as dns } from "node:dns";
import { isIPv4, isIPv6 } from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost"]);

const ALLOWED_PROTOCOLS = new Set(["https:"]);

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 169.254.0.0/16
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // ::1 loopback
  if (normalized === "::1" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
  // fc00::/7 (unique local)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  // fe80::/10 (link-local)
  if (normalized.startsWith("fe80")) return true;

  return false;
}

function isPrivateIP(ip: string): boolean {
  if (isIPv4(ip)) return isPrivateIPv4(ip);
  if (isIPv6(ip)) return isPrivateIPv6(ip);
  return false;
}

export interface ValidateUrlOptions {
  dnsLookup?: (hostname: string) => Promise<{ address: string }>;
}

export async function validateUrl(raw: string, options?: ValidateUrlOptions): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SecurityError(`Invalid URL: ${raw}`);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new SecurityError(`Protocol "${url.protocol}" is not allowed. Only HTTPS is supported.`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new SecurityError(`Hostname "${hostname}" is blocked.`);
  }

  // If the hostname is already an IP, check it directly
  if (isIPv4(hostname) || isIPv6(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new SecurityError(`Access to private IP address "${hostname}" is blocked.`);
    }
    return url;
  }

  // Resolve DNS and check the resolved IP
  const lookup = options?.dnsLookup ?? ((h: string) => dns.lookup(h));
  let resolved: { address: string };
  try {
    resolved = await lookup(hostname);
  } catch {
    throw new SecurityError(`Could not resolve hostname: ${hostname}`);
  }

  if (isPrivateIP(resolved.address)) {
    throw new SecurityError(
      `Hostname "${hostname}" resolved to private IP "${resolved.address}". Access blocked.`,
    );
  }

  return url;
}
