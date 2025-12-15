import * as crypto from 'crypto';
import { ONE_HOUR_SECONDS, ONE_MINUTE_SECONDS } from './constants';
import { NotifyLogsUploadSuccessDto } from '../../modules/app-logs/dto/notify-logs-upload-success.dto';

// eslint-disable-next-line
const dotenv = require('dotenv');

dotenv.config();

export function wait(seconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

const dataCenterUrl = {
  au: {
    api: 'https://projectsapi.zoho.com.au/restapi',
    accounts: 'https://accounts.zoho.com.au',
  },
  eu: {
    api: 'https://projectsapi.zoho.eu/restapi',
    accounts: 'https://accounts.zoho.eu',
  },
  in: {
    api: 'https://projectsapi.zoho.in/restapi',
    accounts: 'https://accounts.zoho.in',
  },
  us: {
    api: 'https://projectsapi.zoho.com/restapi',
    accounts: 'https://accounts.zoho.com',
  },
  jp: {
    api: 'https://projectsapi.zoho.jp/restapi',
    accounts: 'https://accounts.zoho.jp',
  },
  uk: {
    api: 'https://projectsapi.zoho.co.uk/restapi',
    accounts: 'https://accounts.zoho.co.uk',
  },
};

export const getDataCenterUrl = (location) => {
  if (dataCenterUrl[location]) {
    return dataCenterUrl[location];
  }
  return {
    api: `https://projectsapi.zoho.com.${location}/restapi`,
    accounts: `https://accounts.zoho.co.${location}`,
  };
};

export const secondsToHHMM = (seconds: number) => {
  const hours = Math.floor(seconds / ONE_HOUR_SECONDS);
  const minutes = Math.floor((seconds % ONE_HOUR_SECONDS) / ONE_MINUTE_SECONDS);
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  return `${hoursStr}:${minutesStr}`;
};

export const secondsTohhmm = (seconds: number) => {
  const hours = Math.floor(seconds / ONE_HOUR_SECONDS);
  const minutes = Math.floor((seconds % ONE_HOUR_SECONDS) / ONE_MINUTE_SECONDS);
  return `${hours}h ${minutes}m`;
};

export const hhmmToSeconds = (duration: string) => {
  const [hour, min]: string[] = duration.split(' ');
  const hours = parseInt(hour.replace('h', ''), 10);
  const mins = parseInt(min.replace('m', ''), 10);

  return hours * ONE_HOUR_SECONDS + mins * ONE_MINUTE_SECONDS;
};

export function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (!username || !domain) {
    return email;
  }
  const midPoint = Math.ceil(username.length / 2);
  const unmaskedPart = username.substring(0, midPoint);
  const maskedPart = '*'.repeat(username.length - midPoint);
  return `${unmaskedPart}${maskedPart}@${domain}`;
}

export function findNonZeroTotal(invoices: any[]): number {
  for (const invoice of invoices) {
    if (invoice.total !== 0) {
      return invoice.total;
    }
  }
  return 0;
}

export const isUUID = (str: string) => {
  const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidPattern.test(str);
};

const ENCRYPTION_KEY = process.env.FIELD_TRANSFORMER_ENCRYPTION_KEY;

// Replicate OpenSSL's EVP_BytesToKey function exactly as used by createCipher
function evpBytesToKey(password: string, salt: Buffer = Buffer.alloc(0), keyLen = 32): Buffer {
  const data = Buffer.concat([Buffer.from(password, 'utf8'), salt]);
  let key = Buffer.alloc(0);

  while (key.length < keyLen) {
    const hash = crypto.createHash('md5');
    hash.update(key.length > 0 ? Buffer.concat([key, data]) : data);
    const digest = hash.digest();
    key = Buffer.concat([key, digest]);
  }

  return key.subarray(0, keyLen);
}

export const FieldTransformer = {
  to: (value: string) => {
    if (value === undefined || value === '') return '';
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not set');
    // Use the exact same key derivation as createCipher
    const key = evpBytesToKey(ENCRYPTION_KEY);
    const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
    let encrypted = cipher.update(value, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  },
  from: (value: string) => {
    if (value === undefined || value === '') return '';
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not set');
    // Use the exact same key derivation as createCipher
    const key = evpBytesToKey(ENCRYPTION_KEY);
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);
    let decrypted = decipher.update(value, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  },
};

export const convertMinutesToSeconds = (minutes: number, seconds?: number) => minutes * 60 + (seconds ?? 0);

export const prettyJson = (obj: any, mode: string | undefined = 'standard', keyOnTop?: string): string | null => {
  switch (mode.toLowerCase()) {
    case 'standard': {
      const formatObject = (thisObj: any, indent = 0): string => {
        let result = '';
        const indentation = '  '.repeat(indent);

        for (const [key, value] of Object.entries(thisObj)) {
          if (typeof value === 'object' && value !== null) {
            result += `${indentation}${key}:\n`;
            result += formatObject(value, indent + 2);
          } else {
            result += `${indentation}${key}: ${value}\n`;
          }
        }

        return result;
      };

      return formatObject(obj);
    }

    case 'pretty': {
      return JSON.stringify(obj, null, 4);
    }

    case 'jsonarray': {
      if (!Array.isArray(obj)) {
        return obj;
      }
      if (Array.isArray(obj) && obj.length === 0) {
        return '[]';
      }
      let reorder = false;
      if (keyOnTop !== undefined || keyOnTop !== null) {
        reorder = true;
      }
      let result = '';
      for (let i = 0; i < obj.length; i++) {
        if (reorder) {
          result += `${i + 1}: ${JSON.stringify(prettyJson(obj[i], 'reorder', keyOnTop))}\n\n`;
        } else {
          result += `${i + 1}: ${JSON.stringify(obj[i])}\n\n`;
        }
      }

      return result;
    }

    case 'reorder': {
      const reorderedObj = {
        [keyOnTop]: obj[keyOnTop],
        ...obj,
      };

      return reorderedObj;
    }

    default: {
      throw new Error('Invalid mode: Supported modes include: [standard, pretty, jsonarray, reorder]');
    }
  }
};

export const callPromiseWithTimeout = async <T>(apiCall: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), timeoutMs),
  );
  return Promise.race([apiCall, timeoutPromise]);
};

export const getR2FileNameFromUrl = (url: string): string => {
  if (!url) return url;

  try {
    const decodedUrl = decodeURIComponent(url);
    const { pathname } = new URL(decodedUrl);
    return pathname.substring(pathname.lastIndexOf('/') + 1);
  } catch (error) {
    return url;
  }
};

export const safeDecodeURIComponent = (str: string): string => {
  if (!str) return str;

  try {
    // Replace '+' with spaces first (for application/x-www-form-urlencoded format)
    // This is needed for Windows app bug reports where spaces are encoded as '+'
    const withSpaces = str.replace(/\+/g, ' ');
    return decodeURIComponent(withSpaces);
  } catch (error) {
    return str; // Return original string if decoding fails
  }
};

export const escapeMarkdownForCliq = (text: string): string => {
  if (!text) return text;

  const decoded = safeDecodeURIComponent(text);

  return decoded
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/\*/g, '\\*') // Escape asterisks
    .replace(/_/g, '\\_'); // Escape underscores
};

export const constructLogUploadEmailBody = (
  notifyLogsUploadSuccessDto: NotifyLogsUploadSuccessDto,
  downloadUrl: string,
  userId: string,
): string => {
  const { feedback_message, app_platform, app_version } = notifyLogsUploadSuccessDto;

  const decodedFeedback = safeDecodeURIComponent(feedback_message || '');
  const escapedFeedbackMessage = decodedFeedback
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `
    <p>Hi Focus Bear support team,</p>

    <p>A user has submitted feedback along with app usage logs. Please review the details below:</p>

    <p><strong>User ID:</strong> ${userId}</p>
    <p><strong>Feedback:</strong></p>
    <blockquote>${escapedFeedbackMessage}</blockquote>

    <p><strong>App platform:</strong> ${app_platform}</p>
    <p><strong>App version:</strong> ${app_version}</p>

    <p><strong>Logs download link:</strong><br/>
    <a href="${downloadUrl}">View Uploaded Logs</a></p>

    <p>— Automated Notification System</p>
  `;
};

export function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage = 'Operation timed out'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), ms)),
  ]);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
