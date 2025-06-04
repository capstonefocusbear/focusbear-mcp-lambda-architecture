import { Controller, Put, Body, UseGuards } from '@nestjs/common';
import { IsAuth } from '@api-server/modules/auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '@api-server/shared/decorators/passport.decorator';
import { Passport } from '@api-server/modules/auth/domain/passport.model';
import { UsageDataService } from '../../services/usage-data/usage-data.service';
import { SyncUsageDataDto } from '../../dto/sync-usage-data.dto';

@Controller('usage-data')
@UseGuards(IsAuth)
export class UsageDataController {
  constructor(private readonly usageDataService: UsageDataService) {}

  @Put('sync')
  async syncUsageData(@Body() syncDto: SyncUsageDataDto, @AuthContext() { user }: Passport): Promise<void> {
    await this.usageDataService.syncUsageData(user.id, syncDto);
  }
}
