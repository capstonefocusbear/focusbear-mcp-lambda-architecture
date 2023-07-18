import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { SavedWebsiteService } from '../services/saved-website.service';
import { DeleteSavedWebsiteDto } from '../dto/delete-saved-website.dto';
import { SavedWebsite } from '../entities/saved-website.entity';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { SavedWebsiteDto } from '../dto/saved-website.dto';

@Controller('saved-website')
@UseGuards(IsAuth)
@ApiTags('saved-website')
export class SavedWebsiteController {
  constructor(private readonly savedWebsiteService: SavedWebsiteService) {}

  @Get()
  async getUserSavedWebsites(@AuthContext() { user }: Passport): Promise<SavedWebsite[]> {
    return this.savedWebsiteService.getUserSavedWebsites(user.id);
  }

  @Post()
  async saveWebsite(
    @Body() saved_websites: SavedWebsiteDto[],
    @AuthContext() { user }: Passport,
  ): Promise<SavedWebsite[]> {
    return this.savedWebsiteService.saveWebsites(user.id, saved_websites);
  }

  @Delete()
  async deleteSavedWebsite(@Query() { website_id }: DeleteSavedWebsiteDto, @AuthContext() { user }: Passport) {
    return this.savedWebsiteService.deleteSavedWebsite(user.id, website_id);
  }

  @Put('/delete')
  async deleteMultipleWebsites(@Body() website_ids: string[], @AuthContext() { user }: Passport) {
    return this.savedWebsiteService.deleteSavedWebsites(user.id, website_ids);
  }
}
