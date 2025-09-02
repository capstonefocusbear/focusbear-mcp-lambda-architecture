import { ServiceAccountAuthContext } from './service-account-auth-context.model';

export class ServiceAccountPassport {
  constructor({ serviceAccount, isAuth, declineReason }: Partial<ServiceAccountPassport> = {}) {
    this.isAuth = isAuth || false;
    this.serviceAccount = isAuth ? serviceAccount : null;
    this.declineReason = isAuth ? null : declineReason;
  }

  serviceAccount: ServiceAccountAuthContext;

  declineReason: string;

  isAuth: boolean;
}
