import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { HelperCommonService } from '../../helper/services/helper-common/helper-common.service';
import { Passport } from '../domain/passport.model';
import { AuthService } from '../services/auth.service';

@Injectable()
export class PassportMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService, private readonly commonHelperService: HelperCommonService) {}

  /**
   * Passport context will be added into the Req object
   * Passport property in Req is unwritable and unconfigurable (impossible to remove or reassign)
   * Keys of Passport itself and its recursively nested objects are frozen (immutable).
   */
  async use(req, res, next) {
    try {
      const passport = await this.authService.authenticate(req.headers);
      const immutablePassport = this.commonHelperService.deepFreezeObject<Passport>(passport);
      const propertyDescriptor = { value: immutablePassport, writable: false, configurable: false };
      Object.defineProperty(req, 'passport', propertyDescriptor);
      next();
    } catch (err) {
      next(new UnauthorizedException(err));
    }
  }
}
