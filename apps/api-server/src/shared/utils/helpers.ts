import * as crypto from 'crypto';
import { ONE_HOUR_SECONDS, ONE_MINUTE_SECONDS } from './constants';

/* eslint-disable @typescript-eslint/no-var-requires */
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

export const FieldTransformer = {
  to: (value: string) => {
    if (value === undefined || value === '') return '';
    const cipher = crypto.createCipher('aes-256-ecb', ENCRYPTION_KEY);
    let encrypted = cipher.update(value, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  },
  from: (value) => {
    if (value === undefined || value === '') return '';
    const decipher = crypto.createDecipher('aes-256-ecb', ENCRYPTION_KEY);
    let decrypted = decipher.update(value, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  },
};
