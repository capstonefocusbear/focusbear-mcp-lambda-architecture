import { Injectable } from '@nestjs/common';
import { InstalledPack } from '../../entity/installed-pack.entity';
import { InstalledPackRepository } from '../../repositories/installed-pack.repository';

@Injectable()
export class InstalledPackService {
  constructor(private readonly installedPackRepository: InstalledPackRepository) {}

  async setPackAsInstalledForUser(user_id: string, pack_id: string, sequence_id?: string) {
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
  }

  async setPackAsUninstalledForUser(user_id: string, pack_id: string) {
    const installedPackRecord = await this.installedPackRepository.orm.findOne({ where: { user_id, pack_id } });
    installedPackRecord.installation_status = false;
    await this.installedPackRepository.update(installedPackRecord.id, installedPackRecord);
  }
}
