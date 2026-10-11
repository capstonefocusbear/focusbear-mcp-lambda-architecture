import { Module } from '@nestjs/common';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { OAuthStore } from './oauth.store';

@Module({ controllers: [OAuthController], providers: [OAuthService, OAuthStore], exports: [OAuthStore] })
export class OAuthModule {}
