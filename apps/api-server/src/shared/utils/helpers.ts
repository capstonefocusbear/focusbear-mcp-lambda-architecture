import { ONE_HOUR_SECONDS, ONE_MINUTE_SECONDS } from './constants';

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

export function maskEmail(email: string): string {
  const [username, domain] = email.split('@');

  if (!username || !domain) {
    return email;
  }

  if (username.length <= 4) {
    return email; // Return the original email if username has 4 or fewer characters
  }

  const firstTwoChars = username.substring(0, 2);
  const lastTwoChars = username.slice(-2);
  const maskedChars = '*'.repeat(username.length - 4);

  return `${firstTwoChars}${maskedChars}${lastTwoChars}@${domain}`;
}
