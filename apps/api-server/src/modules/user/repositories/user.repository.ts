import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends createBaseRepository<User>(User) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }
}
