import { randomUUID } from 'crypto';
import { Passport } from '../../src/modules/auth/domain/passport.model';

export const authtorizedPassportDummy = new Passport({
  isAuth: true,
  user: { id: randomUUID() },
});

export const unthtorizedPassportDummy = new Passport({
  isAuth: false,
  declineReason: 'The Token expired!',
});
