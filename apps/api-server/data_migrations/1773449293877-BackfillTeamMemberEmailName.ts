import { Logger } from '@nestjs/common';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { Auth0ManagementService } from '@app/auth0';
import { TeamToMember } from '../src/modules/team/entities/team-to-member.entity';

const BATCH_SIZE = 10;
const DELAY_MS = 100; // ~10 requests/second to stay within Auth0 Management API rate limits

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BackfillTeamMemberEmailName1773449293877 implements MigrationInterface {
  name = 'BackfillTeamMemberEmailName1773449293877';

  private readonly logger = new Logger(BackfillTeamMemberEmailName1773449293877.name);

  public async up(queryRunner: QueryRunner): Promise<void> {
    const nullMembers: Array<{ id: string; member_id: string; auth0_id: string }> = await queryRunner.query(`
      SELECT ttm.id, ttm.member_id, u.auth0_id
      FROM team_to_member ttm
      JOIN "user" u ON u.id = ttm.member_id
      WHERE ttm.email IS NULL
        AND ttm.member_id IS NOT NULL
    `);

    if (nullMembers.length === 0) {
      this.logger.log('[BackfillTeamMemberEmailName] No null-email team members found. Nothing to do.');
      return;
    }

    this.logger.log(
      `[BackfillTeamMemberEmailName] Found ${nullMembers.length} team member(s) with null email. Starting backfill...`,
    );

    const auth0Service: Auth0ManagementService = queryRunner.connection.options['auth0ManagementService'];
    if (!auth0Service) {
      this.logger.warn(
        '[BackfillTeamMemberEmailName] Auth0ManagementService not available via connection options. ' +
          'Falling back to TypeORM repository pattern — email/name will be set via entity transformer.',
      );
    }

    const teamToMemberRepository = queryRunner.connection.getRepository(TeamToMember);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    const batches: Array<Array<{ id: string; member_id: string; auth0_id: string }>> = [];
    for (let i = 0; i < nullMembers.length; i += BATCH_SIZE) {
      batches.push(nullMembers.slice(i, i + BATCH_SIZE));
    }

    for (const [batchIndex, batch] of batches.entries()) {
      await Promise.allSettled(
        batch.map(async (member) => {
          try {
            let email: string | null = null;
            let firstName: string | null = null;
            let lastName: string | null = null;

            if (auth0Service) {
              const auth0User = await auth0Service.getAuth0User(member.auth0_id);
              if (!auth0User) {
                this.logger.warn(
                  `[BackfillTeamMemberEmailName] Auth0 user not found for auth0_id=${member.auth0_id} (member_id=${member.member_id}). Skipping.`,
                );
                skipCount++;
                return;
              }
              email = auth0User.email ?? null;
              firstName = auth0User.given_name ?? null;
              lastName = auth0User.family_name ?? null;
            }

            // Use TypeORM repository .save() so column transformers (encryption) are applied automatically
            await teamToMemberRepository.update(
              { id: member.id },
              {
                email: email ?? undefined,
                first_name: firstName ?? undefined,
                last_name: lastName ?? undefined,
              },
            );

            successCount++;
          } catch (err) {
            this.logger.error(`[BackfillTeamMemberEmailName] Failed to update member id=${member.id}: ${err}`);
            errorCount++;
          }
        }),
      );

      // Rate-limit delay between batches
      if (batchIndex < batches.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    this.logger.log(
      `[BackfillTeamMemberEmailName] Done. Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`,
    );
  }

  public async down(): Promise<void> {
    // This migration cannot be safely reversed — email/name data populated from Auth0
    // would need to be individually nulled out, but we don't know which records were
    // originally null vs. already populated. No-op down migration is intentional.
    this.logger.warn('[BackfillTeamMemberEmailName] down() is a no-op. Email/name data cannot be safely reverted.');
  }
}
