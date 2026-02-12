import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import { allEntities } from './all-entities';

/**
 * Canonical list of entity class names. Must stay in sync with all-entities.ts.
 * When adding a new entity file: add the class to all-entities.ts AND add its name here.
 * CI runs this spec to catch unimported entities before deploy.
 */
const EXPECTED_ENTITY_NAMES: string[] = [
  'User',
  'Activity',
  'ActivitySequence',
  'CompletedActivity',
  'Device',
  'CompletedActivitySequence',
  'FocusMode',
  'CompletedFocusBlock',
  'BlockingSchedule',
  'Team',
  'HabitPack',
  'InstalledPack',
  'ActivityTemplate',
  'ActivityTemplateEmbedding',
  'HabitLibraryRequest',
  'Notification',
  'VideoMetadata',
  'Track',
  'FocusModeTemplate',
  'InstalledFocusModeTemplate',
  'Course',
  'CourseEnrolment',
  'CourseRating',
  'Lesson',
  'LessonCompletion',
  'UserConsent',
  'DailyStats',
  'AdminAccessRequest',
  'LogQuantityQuestion',
  'LogQuantityAnswer',
  'FocusModeTag',
  'SavedWebsite',
  'ToDo',
  'ImpactEvent',
  'UserFeedback',
  'TaskTimeLog',
  'PlatformIntegration',
  'SyncedProject',
  'CalendarExcludedKeyword',
  'Calendar',
  'TeamToMember',
  'TeamToAdmin',
  'TrackEvent',
  'Tutorial',
  'Geofence',
  'Feedback',
  'Survey',
  'SurveyAnswer',
  'SurveyAnswerMetadata',
  'ActivityTemplateTag',
  'CustomRoutine',
  'StudyParticipant',
  'UsageData',
  'HealthMetrics',
  'FlankerTest',
  'AsyncTask',
  'AccountabilityBuddy',
  'UnlockRequest',
  'AppVersionEntity',
  'AnnouncementEntity',
  'AnnouncementViewEntity',
  'Project',
  'ProjectMember',
  'TaskComment',
  'TaskAttachment',
  'CommentAttachment',
  'Note',
  'NoteTag',
  'WebhookSubscription',
];

/** Match "export class EntityName" in entity files (handles default and named exports) */
const ENTITY_CLASS_REGEX = /export\s+(?:default\s+)?class\s+(\w+)/;

function discoverEntityClassesFromFiles(): Set<string> {
  const configDir = __dirname;
  const srcRoot = path.join(configDir, '..');
  const apiServerPattern = path.join(srcRoot, 'modules', '**', '*.entity.ts');
  const stripeRoot = path.join(configDir, '..', '..', '..', '..', 'libs', 'stripe', 'src', 'entities');
  const stripePattern = path.join(stripeRoot, '*.entity.ts');

  const apiPaths = globSync(apiServerPattern.replace(/\\/g, '/'));
  const stripePaths = globSync(stripePattern.replace(/\\/g, '/'));
  const allPaths = [...apiPaths, ...stripePaths].filter((p) => !p.includes('base-entity'));

  const discoveredNames = new Set<string>();
  for (const filePath of allPaths) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(ENTITY_CLASS_REGEX);
    if (match?.[1]) {
      discoveredNames.add(match[1]);
    }
  }
  return discoveredNames;
}

describe('allEntities', () => {
  it('exports exactly the expected entities (no unimported or missing entities)', () => {
    const actualNames = allEntities.map((e) => (e as { name: string }).name).sort();
    const expectedSorted = [...EXPECTED_ENTITY_NAMES].sort();

    expect(actualNames).toEqual(expectedSorted);
  });

  it('has no duplicate entity entries', () => {
    const names = allEntities.map((e) => (e as { name: string }).name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('verifies there are no unimported entities (every entity file is in the shared list)', () => {
    const discoveredNames = discoverEntityClassesFromFiles();
    const importedNames = new Set(allEntities.map((e) => (e as { name: string }).name));

    const unimported = [...discoveredNames].filter((n) => !importedNames.has(n));

    if (unimported.length > 0) {
      throw new Error(`Unimported entities (add to all-entities.ts): ${unimported.join(', ')}`);
    }
  });
});
