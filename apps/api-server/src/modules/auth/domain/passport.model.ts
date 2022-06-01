import { User } from '../../user/entities/user.entity';

export class Passport {
  constructor({ user, isAuth, declineReason }: Partial<Passport> = {}) {
    this.isAuth = isAuth || false;
    this.user = isAuth ? user : null;
    this.declineReason = isAuth ? null : declineReason;
  }

  user: Partial<User>;

  declineReason: string;

  isAuth: boolean;
}
