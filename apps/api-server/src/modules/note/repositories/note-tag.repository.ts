import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { NoteTag } from '../entities/note-tag.entity';

@Injectable()
export class NoteTagRepository extends BaseRepository<NoteTag> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, NoteTag);
  }

  async getUserTags(userId: string): Promise<NoteTag[]> {
    return this.orm.find({
      where: { user_id: userId },
      order: { text: 'ASC' },
    });
  }

  async findOrCreateTag(userId: string, text: string, color?: string): Promise<NoteTag> {
    const existingTag = await this.orm.findOne({
      where: { user_id: userId, text },
    });

    if (existingTag) {
      return existingTag;
    }

    const newTag = new NoteTag({ user_id: userId, text, color }, { generateId: true });
    return this.orm.save(newTag);
  }
}
