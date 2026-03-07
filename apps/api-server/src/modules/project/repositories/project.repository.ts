import { Injectable } from '@nestjs/common';
import { Brackets, DataSource, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Project } from '../entities/project.entity';
import { GetProjectsQueryDto } from '../dto/get-projects-query.dto';
import { PageOrder } from '../../../shared/domain/page-order.enum';
import { ProjectMember } from '../entities/project-member.entity';
import { ProjectMemberInvitationStatus } from '../domain/project-member-invitation-status.enum';
import { ProjectStatus } from '../domain/project-status.model';

@Injectable()
export class ProjectRepository extends BaseRepository<Project> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, Project);
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

  /**
   * Atomically ensures a custom status with the given label exists on a project.
   * Uses a `FOR UPDATE` pessimistic lock to prevent TOCTOU races under concurrent writes —
   * two simultaneous calls with the same label will serialize rather than both appending.
   *
   * @returns The existing or newly-created status, plus `already_existed` flag.
   */
  async ensureCustomStatus(
    projectId: string,
    label: string,
    color: string,
    shouldCompleteTask: boolean,
  ): Promise<ProjectStatus & { already_existed: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const project = await manager.findOne(Project, {
        where: { id: projectId, deleted_at: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const existingStatuses: ProjectStatus[] = project.custom_statuses ?? [];

      // Case-insensitive deduplication by label
      const existing = existingStatuses.find((s) => s.label.toLowerCase() === label.toLowerCase());
      if (existing) {
        return { ...existing, already_existed: true };
      }

      const maxOrder = existingStatuses.reduce((max, s) => Math.max(max, s.order), -1);
      const newStatus: ProjectStatus = {
        id: uuidv4(),
        label,
        color,
        order: maxOrder + 1,
        should_complete_task: shouldCompleteTask,
      };

      await manager.update(Project, projectId, { custom_statuses: [...existingStatuses, newStatus] });

      return { ...newStatus, already_existed: false };
    });
  }

  async getUserProjectsPaginated(
    userId: string,
    { order, take, skip }: GetProjectsQueryDto,
  ): Promise<[Project[], number]> {
    const query = this.orm
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'members')
      .where(
        new Brackets((qb) => {
          qb.where('project.owner_id = :userId', { userId }).orWhere((subQueryBuilder) => {
            const acceptedMembershipSubQuery = subQueryBuilder
              .subQuery()
              .select('1')
              .from(ProjectMember, 'project_member')
              .where('project_member.project_id = project.id')
              .andWhere('project_member.user_id = :userId')
              .andWhere('project_member.invitation_status = :acceptedStatus')
              .getQuery();

            return `EXISTS ${acceptedMembershipSubQuery}`;
          });
        }),
      )
      .andWhere('project.deleted_at IS NULL')
      .take(take)
      .skip(skip)
      .orderBy('project.created_at', order === PageOrder.ASC ? 'ASC' : 'DESC')
      .addOrderBy('project.id', order === PageOrder.ASC ? 'ASC' : 'DESC')
      .setParameter('acceptedStatus', ProjectMemberInvitationStatus.ACCEPTED);

    const [projects, total] = await query.getManyAndCount();
    return [projects, total];
  }
}
