import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { UnlockRequestService } from '../services/unlock-request.service';
import { ApproveUnlockRequestDto } from '../dto/approve-unlock-request.dto';

@Controller('accountability-buddy')
@ApiTags('accountability-buddy')
export class AccountabilityBuddyPublicController {
  constructor(private readonly unlockRequestService: UnlockRequestService) {}

  @Get('unlock-request/approve')
  @ApiResponse({ status: 200, description: 'Unlock request approved successfully using token' })
  async approveUnlockRequestByToken(@Query() approveUnlockRequestDto: ApproveUnlockRequestDto) {
    const result = await this.unlockRequestService.approveUnlockRequestByToken(approveUnlockRequestDto.token);
    return {
      status: 'approved',
      unlock_request_id: result.id,
    };
  }
}
