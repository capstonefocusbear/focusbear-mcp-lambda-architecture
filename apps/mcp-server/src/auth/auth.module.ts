import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { ExternalMcpAuthController } from './auth.controller';
import { ExternalMcpAuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [ExternalMcpAuthController],
  providers: [ExternalMcpAuthService, JwtStrategy],
})
export class ExternalMcpModule {}