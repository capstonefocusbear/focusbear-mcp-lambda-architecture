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

    try {
      const newTag = new NoteTag({ user_id: userId, text, color }, { generateId: true });
      return await this.orm.save(newTag);
    } catch (error) {
      if (error?.code === '23505') {
        return this.orm.findOne({ where: { user_id: userId, text } });
      }
      throw error;
    }
  }
}
