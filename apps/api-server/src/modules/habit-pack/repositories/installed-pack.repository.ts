import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { InstalledPack } from '../entity/installed-pack.entity';

@Injectable()
export class InstalledPackRepository extends BaseRepository<InstalledPack> {
  constructor(private readonly connection: Connection) {
    super(connection, InstalledPack);
  }
}
