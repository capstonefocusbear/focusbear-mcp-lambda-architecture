import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { TabKeywordsService } from '../services/tab-keywords.service';

@Controller('tab-keywords')
@ApiTags('tab-keywords')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class TabKeywordsController {
  constructor(private readonly tabKeywordsService: TabKeywordsService) {}

  @Post()
  getKeywords(@Body() { titles }: { titles: string[] }, @AuthContext() { user }: Passport): Promise<string[]> {
    return this.tabKeywordsService.getTabTitlesKeywords(user.id, titles);
  }
}
