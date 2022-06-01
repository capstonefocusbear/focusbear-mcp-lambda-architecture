import { registerAs } from '@nestjs/config';
import { IAuth0Options } from 'libs/auth0/src';

export const auth0Config = registerAs(
  'auth0',
  (): IAuth0Options => ({
    management: {
      clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
      clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
    },
    domain: process.env.AUTH0_DOMAIN,
    connection: process.env.AUTH0_CONNECTION || 'Username-Password-Authentication',
    identifier: process.env.AUTH0_INDENTIFIER,
    actionSecret: process.env.AUTH0_ACTION_SECRET,
  }),
);
