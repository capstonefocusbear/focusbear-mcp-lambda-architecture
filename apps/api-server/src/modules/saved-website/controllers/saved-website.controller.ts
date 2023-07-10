import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { SavedWebsiteService } from '../services/saved-website.service';
import { SavedWebsiteDto } from '../dto/saved-website.dto';
import { DeleteSavedWebsiteDto } from '../dto/delete-saved-website.dto';
import { SavedWebsite } from '../entities/saved-website.entity';

@Controller('saved-website')
export class SavedWebsiteController {
  constructor(private readonly savedWebsiteService: SavedWebsiteService) {}

  @Get()
  async getUserSavedWebsites(@AuthContext() { user }: Passport): Promise<SavedWebsite[]> {
    return this.savedWebsiteService.getUserSavedWebsites(user.id);
  }

  @Post()
  async saveWebsite(@Body() websiteData: SavedWebsiteDto, @AuthContext() { user }: Passport): Promise<SavedWebsite> {
    return this.savedWebsiteService.saveWebsite(user.id, websiteData);
  }

  @Delete()
  async deleteSavedWebsite(@Query() { website_id }: DeleteSavedWebsiteDto, @AuthContext() { user }: Passport) {
    return this.savedWebsiteService.deleteSavedWebsite(user.id, website_id);
  }
}
