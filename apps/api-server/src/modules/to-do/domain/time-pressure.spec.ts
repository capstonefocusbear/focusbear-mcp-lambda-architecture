import {
  timePressureScore,
  topScore,
  perspirationLevelToMinutes,
  SCORE_TODAY,
  SCORE_PAST_DUE,
  SCORE_FLOOR,
  baseUrgency,
  workloadShareOfRunway,
} from './time-pressure';

describe('Time Pressure Score - Size-Aware Implementation', () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  describe('perspirationLevelToMinutes', () => {
    it('should convert perspiration levels to minutes correctly', () => {
      expect(perspirationLevelToMinutes(1)).toBe(5);
      expect(perspirationLevelToMinutes(2)).toBe(15);
      expect(perspirationLevelToMinutes(3)).toBe(30);
      expect(perspirationLevelToMinutes(4)).toBe(60);
      expect(perspirationLevelToMinutes(5)).toBe(240);
      expect(perspirationLevelToMinutes(6)).toBe(240);
      expect(perspirationLevelToMinutes(7)).toBe(480);
      expect(perspirationLevelToMinutes(8)).toBe(480);
      expect(perspirationLevelToMinutes(9)).toBe(3360);
      expect(perspirationLevelToMinutes(10)).toBe(3360);

      // Unknown perspiration level should default to 5 minutes
      expect(perspirationLevelToMinutes(99)).toBe(5);
    });
  });

  describe('baseUrgency', () => {
    it('should calculate base urgency using logarithmic formula', () => {
      expect(baseUrgency(0)).toBeCloseTo(8.0, 2);
      expect(baseUrgency(1)).toBeCloseTo(6.96, 2);
      expect(baseUrgency(21)).toBeCloseTo(3.36, 2);
    });
  });

  describe('workloadShareOfRunway', () => {
    it('should calculate workload share correctly', () => {
      expect(workloadShareOfRunway(5, 21)).toBeCloseTo(5 / (5 + 60 * 21), 3);
      expect(workloadShareOfRunway(240, 1)).toBeCloseTo(240 / (240 + 60 * 1), 3);
      expect(workloadShareOfRunway(60, 0)).toBeCloseTo(1.0, 3);
    });
  });

  describe('timePressureScore - Acceptance Criteria', () => {
    it('AC1: due_date = current_date + 21 days, minutes = 5 → score = 0.10 (floored)', () => {
      const dueDate = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);
      const score = timePressureScore(dueDate, 5);
      expect(score).toBeCloseTo(0.1, 2);
    });

    it('AC2: due_date = current_date + 1 day, minutes = 240 → score ≈ 6.96 (±0.05)', () => {
      const dueDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
      const score = timePressureScore(dueDate, 240);
      expect(score).toBeCloseTo(6.96, 1);
    });

    it('AC3: Increasing minutes at fixed days increases score monotonically', () => {
      const dueDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
      const score30 = timePressureScore(dueDate, 30);
      const score60 = timePressureScore(dueDate, 60);
      const score120 = timePressureScore(dueDate, 120);
      const score240 = timePressureScore(dueDate, 240);

      expect(score30).toBeLessThan(score60);
      expect(score60).toBeLessThan(score120);
      expect(score120).toBeLessThan(score240);
    });

    it('AC4: Increasing days at fixed minutes decreases score monotonically', () => {
      const effort = 240;
      const score1 = timePressureScore(new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), effort);
      const score3 = timePressureScore(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), effort);
      const score7 = timePressureScore(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), effort);
      const score14 = timePressureScore(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), effort);

      expect(score1).toBeGreaterThan(score3);
      expect(score3).toBeGreaterThan(score7);
      expect(score7).toBeGreaterThan(score14);
    });

    it('AC5: Past due = 10.0', () => {
      const pastDue = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
      const score = timePressureScore(pastDue, 60);
      expect(score).toBe(10.0);
    });

    it('AC6: Due today = 9.0', () => {
      const score = timePressureScore(today, 60);
      expect(score).toBe(9.0);
    });

    it('AC7: NULL date = 0.1', () => {
      const score = timePressureScore(null as any, 60);
      expect(score).toBe(0.1);
    });
  });

  describe('timePressureScore - Special Cases', () => {
    it('should handle invalid dates', () => {
      expect(timePressureScore('invalid-date', 60)).toBe(0.1);
      expect(timePressureScore(new Date('invalid'), 60)).toBe(0.1);
    });

    it('should handle null/undefined effort minutes', () => {
      const dueDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
      expect(timePressureScore(dueDate, null as any)).toBe(0.1);
      expect(timePressureScore(dueDate, undefined as any)).toBe(0.1);
    });

    it('should handle negative effort minutes', () => {
      const dueDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
      const score = timePressureScore(dueDate, -10);
      expect(score).toBe(0.1);
    });

    it('should handle very large effort minutes', () => {
      const dueDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
      const score = timePressureScore(dueDate, 10000);
      expect(score).toBeGreaterThan(0.1);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe('timePressureScore - Size-Aware Behavior', () => {
    it('should prioritize large tasks due soon over small tasks due later', () => {
      const largeTaskSoon = timePressureScore(new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), 240);
      const smallTaskLater = timePressureScore(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), 5);

      expect(largeTaskSoon).toBeGreaterThan(smallTaskLater);
    });

    it('should floor tiny tasks far in the future', () => {
      const tinyTaskFar = timePressureScore(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), 5);

      expect(tinyTaskFar).toBe(0.1);
    });
  });

  describe('topScore', () => {
    it('should calculate top score correctly', () => {
      const dueDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
      const score = topScore(dueDate, 5, 60);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle zero effort minutes', () => {
      const dueDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
      const score = topScore(dueDate, 5, 0);
      expect(score).toBeGreaterThan(0);
    });

    it('should calculate top score with perspiration level conversion', () => {
      const dueDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
      const score = topScore(dueDate, 1, 240);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Constants', () => {
    it('should have correct constant values', () => {
      expect(SCORE_TODAY).toBe(9);
      expect(SCORE_PAST_DUE).toBe(10);
      expect(SCORE_FLOOR).toBe(0.1);
    });
  });
});
