import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Passport } from '../../domain/passport.model';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const passport = (req as { raw?: { passport?: Passport } }).raw?.passport;
    if (passport?.user?.id) {
      return passport.user.id;
    }
    return req.ip as string;
  }
}
