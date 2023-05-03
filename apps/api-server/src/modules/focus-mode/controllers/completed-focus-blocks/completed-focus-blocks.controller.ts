import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { GetFocusStatsQueryDto } from '../../dto/get-focus-stats-query.dto';
import { Passport } from '../../../auth/domain/passport.model';
import { CompletedFocusBlockService } from '../../services/completed-focus-blocks/completed-focus-blocks.service';

@Controller('completed-focus-blocks')
@ApiTags('focus-mode')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class CompletedFocusBlocksController {
  constructor(private readonly completedFocusBlockService: CompletedFocusBlockService) {}

  @Get()
  async getFocusBlockStats(@Query() getFocusStatsQuery: GetFocusStatsQueryDto, @AuthContext() { user }: Passport) {
    return this.completedFocusBlockService.getFocusBlockStats(user.id, getFocusStatsQuery);
  }
}
