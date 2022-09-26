import { Module } from '@nestjs/common';
import { DynamicModuleFactory } from '../../dynamic-module/src';
import { IJwtOptions } from './interfaces';
import { JWT_MODULE_OPTIONS } from './jwt.constants';
import { JwtService } from './jwt.service';

@Module({
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule extends DynamicModuleFactory<IJwtOptions>(JWT_MODULE_OPTIONS) {}
