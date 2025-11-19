import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { UnlockRequestService } from '../services/unlock-request.service';
import { ApproveUnlockRequestDto } from '../dto/approve-unlock-request.dto';

@Controller('accountability-buddy')
@ApiTags('accountability-buddy')
export class AccountabilityBuddyPublicController {
  constructor(private readonly unlockRequestService: UnlockRequestService) {}

  @Get('unlock-request/approve')
  @ApiResponse({ status: 200, description: 'Unlock request approved successfully using token (GET)' })
  async approveUnlockRequestByTokenGet(@Query() approveUnlockRequestDto: ApproveUnlockRequestDto) {
    return this.approveUnlockRequestByToken(approveUnlockRequestDto);
  }

  @Post('unlock-request/approve')
  @ApiResponse({ status: 200, description: 'Unlock request approved successfully using token (POST)' })
  async approveUnlockRequestByTokenPost(@Body() approveUnlockRequestDto: ApproveUnlockRequestDto) {
    return this.approveUnlockRequestByToken(approveUnlockRequestDto);
  }

  private async approveUnlockRequestByToken(approveUnlockRequestDto: ApproveUnlockRequestDto) {
    const result = await this.unlockRequestService.approveUnlockRequestByToken(approveUnlockRequestDto.token);
    return {
      status: 'approved',
      unlock_request_id: result.id,
    };
  }
}
