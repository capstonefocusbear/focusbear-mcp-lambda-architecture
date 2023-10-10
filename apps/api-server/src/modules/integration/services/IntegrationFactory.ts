import { IntegrationPlatforms } from "../../platform-integrations/domain/integration-platforms.enum";
import { ZohoService } from "./zoho.service";
import { BaseIntegrationService } from "./base.service";
import { MondayService } from "./monday.service";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class IntegrationFactory {
  private static services: Map<IntegrationPlatforms, BaseIntegrationService> = new Map<IntegrationPlatforms, BaseIntegrationService>;
  
  constructor(
    private readonly mondayService: MondayService,
    private readonly zohoService: ZohoService
    ) {
    IntegrationFactory.register(IntegrationPlatforms.MONDAY, mondayService);
    IntegrationFactory.register(IntegrationPlatforms.ZOHO, zohoService);
    console.log('platform registered');
  }
  
  static register(platform: IntegrationPlatforms, service: BaseIntegrationService) {
    IntegrationFactory.services.set(platform, service);
  }
  
  get(platform: IntegrationPlatforms) {
    const service = IntegrationFactory.services.get(platform);
    if (!service) {
      throw Error(`${ platform } Platform Service Not Found`);
    }

    return service;
  }
}