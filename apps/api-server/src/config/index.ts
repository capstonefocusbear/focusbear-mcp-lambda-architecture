import { auth0Config } from './auth0.config';
import { bullConfig } from './bull.config';
import { constants } from './constants.config';
import { helmetConfig } from './helmet.config';
import { tokensConfig } from './jwt.config';
import { metricsConfig } from './metrics.config';
import { openAiConfig } from './openai.config';
import { pinoConfig } from './pino.config';
import { pusherBeamsConfig } from './pusher-beams.config';
import { pusherCongif } from './pusher.config';
import { r2Config } from './r2.config';
import { revenueCatConfig } from './revenue-cat.config';
import { sendGridConfig } from './send-grid.config';
import { sentryConfig } from './sentry.config';
import { serverConfig } from './server.config';
import { stripeConfig } from './stripe.config';
import { typeormConfig } from './typeorm.config';
import { validationPipeConfig } from './validation-pipe.config';
import { zohoConfig } from './zoho.config';

export * from './server.config';
export * from './helmet.config';
export * from './typeorm.config';
export * from './validation-pipe.config';
export * from './auth0.config';
export * from './constants.config';
export * from './pusher.config';
export * from './revenue-cat.config';
export * from './stripe.config';
export * from './pino.config';
export * from './send-grid.config';
export * from './jwt.config';
export * from './pusher-beams.config';
export * from './sentry.config';
export * from './bull.config';
export * from './r2.config';
export * from './openai.config';
export * from './zoho.config';
export * from './metrics.config';

export const configsArray = [
  serverConfig,
  helmetConfig,
  typeormConfig,
  validationPipeConfig,
  auth0Config,
  constants,
  pusherCongif,
  revenueCatConfig,
  stripeConfig,
  pinoConfig,
  sendGridConfig,
  tokensConfig,
  pusherBeamsConfig,
  sentryConfig,
  bullConfig,
  r2Config,
  openAiConfig,
  zohoConfig,
  metricsConfig,
];
