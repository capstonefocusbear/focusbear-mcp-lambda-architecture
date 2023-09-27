import { registerAs } from '@nestjs/config';

export const zohoConfig = registerAs('zoho', () => ({
  ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
  ZOHO_CALLBACK_URL: process.env.ZOHO_CALLBACK_URL,
  ZOHO_CALLBACK_URL_DEVELOPMENT: process.env.ZOHO_CALLBACK_URL_DEVELOPMENT,
}));
