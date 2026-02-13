import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import { allEntities } from './all-entities';

/** Match "export class EntityName" in entity files (handles default and named exports) */
const ENTITY_CLASS_REGEX = /export\s+(?:default\s+)?class\s+(\w+)/;
/** Match files that define a TypeORM entity (including non-.entity.ts names) */
const ENTITY_DECORATOR_REGEX = /@Entity\s*\(/;

function discoverEntityClassesFromFiles(): Set<string> {
  const configDir = __dirname;
  const srcRoot = path.join(configDir, '..');
  const stripeRoot = path.join(configDir, '..', '..', '..', '..', 'libs', 'stripe', 'src', 'entities');

  // Discover all .ts files in modules (any name) and stripe entities, then keep only those containing @Entity()
  const apiServerPattern = path.join(srcRoot, 'modules', '**', '*.ts');
  const stripePattern = path.join(stripeRoot, '*.entity.ts');

  const apiPaths = globSync(apiServerPattern.replace(/\\/g, '/'));
  const stripePaths = globSync(stripePattern.replace(/\\/g, '/'));
  const allPaths = [...apiPaths, ...stripePaths].filter((p) => !p.includes('base-entity') && !p.endsWith('.spec.ts'));

  const discoveredNames = new Set<string>();
  for (const filePath of allPaths) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (ENTITY_DECORATOR_REGEX.test(content)) {
      const match = content.match(ENTITY_CLASS_REGEX);
      if (match?.[1]) {
        discoveredNames.add(match[1]);
      }
    }
  }
  return discoveredNames;
}

describe('allEntities', () => {
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
