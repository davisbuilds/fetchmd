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

  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;

  return false;
}

// WHY: an IPv4-mapped/compatible IPv6 address can carry its IPv4 dotted
// ("::ffff:127.0.0.1") or as two hex groups ("::ffff:7f00:1"); both must be
// decoded so the IPv4 rules apply.
function mappedIPv4(ip: string): string | undefined {
  const normalized = ip.toLowerCase();
  const prefix = normalized.startsWith("::ffff:")
    ? "::ffff:"
    : normalized.startsWith("::")
      ? "::"
      : undefined;
  if (!prefix) return undefined;

  const tail = normalized.slice(prefix.length);
  if (isIPv4(tail)) return tail;
  const groups = tail.split(":");
  if (groups.length !== 2) return undefined;
  const octets: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return undefined;
    const word = Number.parseInt(group, 16);
    octets.push((word >> 8) & 0xff, word & 0xff);
  }
  return octets.join(".");
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  // fe80::/10 (link-local)
  if (normalized.startsWith("fe80")) return true;

  const embedded = mappedIPv4(normalized);
  if (embedded && isPrivateIPv4(embedded)) return true;

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

  if (isIPv4(hostname) || isIPv6(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new SecurityError(`Access to private IP address "${hostname}" is blocked.`);
    }
    return url;
  }

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
