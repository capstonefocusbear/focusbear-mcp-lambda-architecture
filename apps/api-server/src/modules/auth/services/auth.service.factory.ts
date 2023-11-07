import { Injectable } from '@nestjs/common';
import { IntegrationPlatforms } from '../../platform-integrations/domain/integration-platforms.enum';
import { ZohoAuthService } from './zoho-auth.service';
import { AsanaAuthService } from './asana-auth.service';
import { MondayAuthService } from './monday-auth.service';
import { TrelloAuthService } from './trello-auth.service';
import { JiraAuthService } from './jira-auth.service';
import { ClickUpAuthService } from './clickup-auth.service';

@Injectable()
export class AuthServiceFactory {
  constructor(
    private readonly zohoAuthService: ZohoAuthService,
    private readonly mondayAuthService: MondayAuthService,
    private readonly asanaAuthService: AsanaAuthService,
    private readonly trelloAuthService: TrelloAuthService,
    private readonly jiraAuthService: JiraAuthService,
    private readonly clickUpAuthService: ClickUpAuthService,
  ) {}

  get(platform: IntegrationPlatforms) {
    switch (platform) {
      case IntegrationPlatforms.ZOHO:
        return this.zohoAuthService;
      case IntegrationPlatforms.MONDAY:
        return this.mondayAuthService;
      case IntegrationPlatforms.ASANA:
        return this.asanaAuthService;
      case IntegrationPlatforms.TRELLO:
        return this.trelloAuthService;
      case IntegrationPlatforms.JIRA:
        return this.jiraAuthService;
      case IntegrationPlatforms.CLICK_UP:
        return this.clickUpAuthService;
      default:
        throw Error(`${platform} Platform Service Not Found`);
    }
  }
}
