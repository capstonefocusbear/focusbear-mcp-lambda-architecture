import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { CustomRoutine } from '../entities/custom-routine';

@Injectable()
export class CustomRoutineRepository extends BaseRepository<CustomRoutine> {
  constructor(private readonly connection: Connection) {
    super(connection, CustomRoutine);
  }

  async getUserCustomRoutines(user_id: string) {
    return this.orm.find({
      where: {
        user_id,
      },
    });
  }
}
