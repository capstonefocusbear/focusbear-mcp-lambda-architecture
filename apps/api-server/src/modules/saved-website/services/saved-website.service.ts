import { Injectable } from '@nestjs/common';
import { ResponseMessage } from '../../../shared/domain/response-message.model';
import { SavedWebsiteRepository } from '../repositories/saved-website.repository';
import { SavedWebsiteDto } from '../dto/saved-website.dto';
import { SavedWebsite } from '../entities/saved-website.entity';

@Injectable()
export class SavedWebsiteService {
  constructor(private readonly savedWebsiteRepository: SavedWebsiteRepository) {}

  async getUserSavedWebsites(user_id: string) {
    return this.savedWebsiteRepository.orm.find({ where: { user_id }, order: { created_at: 'DESC' } });
  }

  async saveWebsites(user_id: string, savedWebsites: SavedWebsiteDto[]) {
    const websites = savedWebsites.map((website) => {
      return new SavedWebsite({ user_id, ...website });
    });
    return this.savedWebsiteRepository.orm.save(websites);
  }

  async deleteSavedWebsite(user_id: string, website_id: string) {
    await this.savedWebsiteRepository.orm.delete({ user_id, id: website_id });
    return new ResponseMessage(`Successfully deleted saved website with ID: ${website_id}`);
  }
}
