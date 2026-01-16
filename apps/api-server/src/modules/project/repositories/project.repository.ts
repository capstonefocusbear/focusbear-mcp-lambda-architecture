import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectRepository extends BaseRepository<Project> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, Project);
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return this.orm
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'members')
      .where('project.owner_id = :userId', { userId })
      .andWhere('project.deleted_at IS NULL')
      .orWhere('members.user_id = :userId AND members.invitation_status = :status', {
        userId,
        status: 'accepted',
      })
      .andWhere('project.deleted_at IS NULL')
      .orderBy('project.created_at', 'DESC')
      .getMany();
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    return this.orm.findOne({
      where: { id: projectId, deleted_at: IsNull() },
      relations: ['members', 'members.user', 'owner'],
    });
  }

  async getProjectWithTaskCount(projectId: string): Promise<(Project & { task_count: number }) | null> {
    const result = await this.orm
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('project.owner', 'owner')
      .loadRelationCountAndMap('project.task_count', 'project.tasks')
      .where('project.id = :projectId', { projectId })
      .andWhere('project.deleted_at IS NULL')
      .getOne();

    return result as (Project & { task_count: number }) | null;
  }

  async softDelete(projectId: string): Promise<void> {
    await this.orm.update(projectId, { deleted_at: new Date() });
  }

  async getProjectsUserIsMemberOf(userId: string): Promise<Project[]> {
    return this.orm
      .createQueryBuilder('project')
      .innerJoin('project.members', 'members')
      .leftJoinAndSelect('project.members', 'allMembers')
      .where('members.user_id = :userId', { userId })
      .andWhere('members.invitation_status = :status', { status: 'accepted' })
      .andWhere('project.deleted_at IS NULL')
      .orderBy('project.created_at', 'DESC')
      .getMany();
  }

  async getProjectsUserOwns(userId: string): Promise<Project[]> {
    return this.orm.find({
      where: { owner_id: userId, deleted_at: IsNull() },
      relations: ['members'],
      order: { created_at: 'DESC' },
    });
  }

  async getAllUserProjects(userId: string): Promise<Project[]> {
    const ownedProjects = await this.getProjectsUserOwns(userId);
    const memberProjects = await this.getProjectsUserIsMemberOf(userId);

    // Combine and deduplicate
    const projectMap = new Map<string, Project>();
    for (const project of [...ownedProjects, ...memberProjects]) {
      if (!projectMap.has(project.id)) {
        projectMap.set(project.id, project);
      }
    }

    return Array.from(projectMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
}
