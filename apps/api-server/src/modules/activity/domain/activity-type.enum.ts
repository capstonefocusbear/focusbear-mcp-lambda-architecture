export enum ActivityType {
  break = 'breaking',
  morning = 'morning',
  evening = 'evening',
  standalone = 'standalone',
  library = 'library',
}

/**
 * Normalizes a routine type string to its corresponding ActivityType value.
 * This handles the 'break' -> 'breaking' mapping and ensures consistent
 * database queries.
 *
 * @param routineType - Raw routine type string (e.g., 'break', 'morning')
 * @returns The normalized ActivityType value, or undefined if invalid
 */
export function normalizeRoutineTypeToActivityType(routineType?: string): string | undefined {
  if (!routineType) return undefined;

  const normalized = String(routineType).trim().toLowerCase();

  switch (normalized) {
    case 'morning':
      return ActivityType.morning;
    case 'evening':
      return ActivityType.evening;
    case 'break':
    case 'breaking':
      return ActivityType.break;
    case 'library':
      return ActivityType.library;
    case 'standalone':
      return ActivityType.standalone;
    default:
      return undefined;
  }
}
