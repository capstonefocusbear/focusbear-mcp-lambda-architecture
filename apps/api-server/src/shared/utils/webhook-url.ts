import { isIP } from 'net';
import { promises as dns } from 'dns';

const LOCALHOST_HOSTNAME = 'localhost';

const normalizeHostname = (hostname: string): string => hostname.toLowerCase().replace(/\.$/, '');

const isLocalhostHostname = (hostname: string): boolean => {
  const normalized = normalizeHostname(hostname);
  return normalized === LOCALHOST_HOSTNAME || normalized.endsWith(`.${LOCALHOST_HOSTNAME}`);
};

export const isPrivateIp = (ip: string): boolean => {
  const normalized = ip.toLowerCase();

  if (normalized === '::1' || normalized === '::') {
    return true;
  }

  if (normalized.startsWith('fe80:')) {
    return true; // IPv6 link-local
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true; // IPv6 unique local
  }

  if (normalized.startsWith('::ffff:')) {
    return isPrivateIp(normalized.replace('::ffff:', ''));
  }

  if (isIP(normalized) !== 4) {
    return false;
  }

  const [a, b] = normalized.split('.').map((octet) => Number(octet));

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // Carrier-grade NAT

  return false;
};

export const isPublicHostname = (hostname: string): boolean => {
  if (!hostname) return false;

  const normalized = normalizeHostname(hostname);

  if (isLocalhostHostname(normalized)) {
    return false;
  }

  const ipVersion = isIP(normalized);
  if (ipVersion) {
    return !isPrivateIp(normalized);
  }

  return true;
};

export const isPublicWebhookUrl = (url: string): boolean => {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    return isPublicHostname(parsedUrl.hostname);
  } catch (error) {
    return false;
  }
};

export const resolvesToPublicAddress = async (hostname: string): Promise<boolean> => {
  if (!hostname) return false;

  const normalized = normalizeHostname(hostname);

  if (!isPublicHostname(normalized)) {
    return false;
  }

  if (isIP(normalized)) {
    return !isPrivateIp(normalized);
  }

  try {
    const addresses = await dns.lookup(normalized, { all: true });
    if (!addresses.length) return false;

    return !addresses.some((address) => isPrivateIp(address.address));
  } catch (error) {
    return false;
  }
};
