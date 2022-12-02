import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { InstalledPack } from '../../entity/installed-pack.entity';
import { InstalledPackRepository } from '../../repositories/installed-pack.repository';

@Injectable()
export class InstalledPackService {
  constructor(
    private readonly installedPackRepository: InstalledPackRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async setPackAsInstalledForUser(user_id: string, pack_id: string, sequence_id?: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Setting pack as installed for user',
      });
      const recordToUpdate = await this.installedPackRepository.orm.findOne({ where: { user_id, pack_id } });
      if (recordToUpdate) {
        recordToUpdate.installation_status = true;
        recordToUpdate.activity_sequence_id = sequence_id || null;
        await this.installedPackRepository.update(recordToUpdate.id, recordToUpdate);
        return;
      }
      const newInstalledPackRecord = new InstalledPack({
        user_id,
        pack_id,
        installation_status: true,
        activity_sequence_id: sequence_id || null,
      });
      await this.installedPackRepository.create(newInstalledPackRecord);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async setPackAsUninstalledForUser(user_id: string, pack_id: string) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Setting pack as uninstalled for user',
      });
      const installedPackRecord = await this.installedPackRepository.orm.findOne({ where: { user_id, pack_id } });
      installedPackRecord.installation_status = false;
      await this.installedPackRepository.update(installedPackRecord.id, installedPackRecord);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
