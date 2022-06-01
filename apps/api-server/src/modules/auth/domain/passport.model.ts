import { UserAuthContext } from './user-auth-context.model';

export class Passport {
  constructor({ user, isAuth, declineReason }: Partial<Passport> = {}) {
    this.isAuth = isAuth || false;
    this.user = isAuth ? user : null;
    this.declineReason = isAuth ? null : declineReason;
  }

  user: UserAuthContext;

  declineReason: string;

  isAuth: boolean;
}
