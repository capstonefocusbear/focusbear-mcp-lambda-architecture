import { Module } from '@nestjs/common';
import { DynamicModuleFactory } from '../../dynamic-module/src';
import { IAuth0Options } from './interfaces';
import { AUTH0_MODULE_OPTIONS } from './auth0.constants';
import { Auth0AuthenticationService } from './services/auth0-authentication.service';
import { Auth0ManagementService } from './services/auth0-management.service';

@Module({
  providers: [Auth0AuthenticationService, Auth0ManagementService],
  exports: [Auth0AuthenticationService, Auth0ManagementService],
})
export class Auth0Module extends DynamicModuleFactory<IAuth0Options>(AUTH0_MODULE_OPTIONS) {}
