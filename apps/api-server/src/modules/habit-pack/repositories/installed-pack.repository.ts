import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { InstalledPack } from '../entity/installed-pack.entity';

@Injectable()
export class InstalledPackRepository extends BaseRepository<InstalledPack> {
  constructor(private readonly connection: Connection) {
    super(connection, InstalledPack);
  }

  async fetchUserInstalledPackIds(user_id: string): Promise<string[]> {
    const fetchedPacks = await this.orm
      .createQueryBuilder('installed_packs')
      .select(['installed_packs.pack_id'])
      .where('installed_packs.user_id = :user_id', { user_id })
      .andWhere('installed_packs.installation_status = :true', { true: true })
      .getMany();

    const packIds = [];
    fetchedPacks.forEach((pack) => packIds.push(pack.pack_id));
    return packIds;
  }
}
