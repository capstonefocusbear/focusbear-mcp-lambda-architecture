import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Passport } from '../domain/passport.model'; // <-- Import it here

export const AuthContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Passport => {
    const request = ctx.switchToHttp().getRequest();
    
    // Wraps the user object from Passport.js into our strict model
    return { user: request.user };
  },
);