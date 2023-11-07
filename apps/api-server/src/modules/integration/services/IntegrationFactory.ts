import { Injectable } from '@nestjs/common';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { ZohoService } from './zoho.service';
import { BaseIntegrationService } from './base.service';
import { MondayService } from './monday.service';
import { JiraService } from './jira.service';
import { TrelloService } from './trello.service';
import { AsanaService } from './asana.service';
import { ClickUpService } from './clickup.service';

@Injectable()
export class IntegrationFactory {
  private static services: Map<IntegrationPlatforms, BaseIntegrationService> = new Map<
    IntegrationPlatforms,
    BaseIntegrationService
  >();

  constructor(
    private readonly mondayService: MondayService,
    private readonly zohoService: ZohoService,
    private readonly jiraService: JiraService,
    private readonly trelloService: TrelloService,
    private readonly asanaService: AsanaService,
    private readonly clickUpService: ClickUpService,
  ) {
    IntegrationFactory.register(IntegrationPlatforms.MONDAY, mondayService);
    IntegrationFactory.register(IntegrationPlatforms.ZOHO, zohoService);
    IntegrationFactory.register(IntegrationPlatforms.TRELLO, trelloService);
    IntegrationFactory.register(IntegrationPlatforms.JIRA, jiraService);
    IntegrationFactory.register(IntegrationPlatforms.ASANA, asanaService);
    IntegrationFactory.register(IntegrationPlatforms.CLICK_UP, clickUpService);
  }

  static register(platform: IntegrationPlatforms, service: BaseIntegrationService) {
    IntegrationFactory.services.set(platform, service);
  }

  get(platform: IntegrationPlatforms) {
    const service = IntegrationFactory.services.get(platform);
    if (!service) {
      throw Error(`${platform} Platform Service Not Found`);
    }

    return service;
  }
}
