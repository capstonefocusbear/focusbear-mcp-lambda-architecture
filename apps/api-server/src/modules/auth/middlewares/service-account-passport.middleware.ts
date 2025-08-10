import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { HelperCommonService } from '../../helper/services/helper-common/helper-common.service';
import { ServiceAccountPassport } from '../domain/service-account-passport.model';
import { ServiceAccountAuthService } from '../services/service-account-auth.service';

@Injectable()
export class ServiceAccountPassportMiddleware implements NestMiddleware {
  constructor(
    private readonly serviceAccountAuthService: ServiceAccountAuthService,
    private readonly commonHelperService: HelperCommonService,
  ) {}

  /**
   * Service Account Passport context will be added into the Req object
   * ServiceAccountPassport property in Req is unwritable and unconfigurable (impossible to remove or reassign)
   * Keys of ServiceAccountPassport itself and its recursively nested objects are frozen (immutable).
   */
  async use(req, res, next) {
    try {
      const passport = await this.serviceAccountAuthService.authenticate(req.headers);
      const immutablePassport = this.commonHelperService.deepFreezeObject<ServiceAccountPassport>(passport);
      const propertyDescriptor = { value: immutablePassport, writable: false, configurable: false };
      Object.defineProperty(req, 'serviceAccountPassport', propertyDescriptor);
      next();
    } catch (err) {
      next(new UnauthorizedException(err));
    }
  }
}
