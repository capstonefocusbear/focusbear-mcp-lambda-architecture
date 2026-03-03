import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCompletedActivityDto } from './create-completed-activity.dto';
import { CreateSkippedActivityDto } from './create-skipped-activity.dto';

describe('CreateCompletedActivityDto and CreateSkippedActivityDto', () => {
  describe('choice_id validation', () => {
    it('should accept empty string choice_id and transform it to undefined', async () => {
      const dto = plainToInstance(CreateCompletedActivityDto, {
        activity_id: '821de233-ce30-41af-95c7-f46ed8887c1b',
        device_id: 'b3ccce74-d712-43c6-8dd7-f9ae9456c472',
        activity_sequence_id: '5c7e7824-dbb6-4d8d-80b3-69e214c225af',
        duration_logged: 60,
        start_time: '2025-12-02T04:43:22.024Z',
        finish_time: '2025-12-02T04:44:22.024Z',
        choice_id: '', // Empty string should be transformed to undefined
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.choice_id).toBeUndefined();
    });

    it('should accept valid UUID choice_id', async () => {
      const validUUID = '821de233-ce30-41af-95c7-f46ed8887c1b';
      const dto = plainToInstance(CreateCompletedActivityDto, {
        activity_id: '821de233-ce30-41af-95c7-f46ed8887c1b',
        device_id: 'b3ccce74-d712-43c6-8dd7-f9ae9456c472',
        activity_sequence_id: '5c7e7824-dbb6-4d8d-80b3-69e214c225af',
        duration_logged: 60,
        start_time: '2025-12-02T04:43:22.024Z',
        finish_time: '2025-12-02T04:44:22.024Z',
        choice_id: validUUID,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.choice_id).toBe(validUUID);
    });

    it('should accept undefined choice_id', async () => {
      const dto = plainToInstance(CreateCompletedActivityDto, {
        activity_id: '821de233-ce30-41af-95c7-f46ed8887c1b',
        device_id: 'b3ccce74-d712-43c6-8dd7-f9ae9456c472',
        activity_sequence_id: '5c7e7824-dbb6-4d8d-80b3-69e214c225af',
        duration_logged: 60,
        start_time: '2025-12-02T04:43:22.024Z',
        finish_time: '2025-12-02T04:44:22.024Z',
        // choice_id is not provided
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.choice_id).toBeUndefined();
    });

    it('should reject invalid UUID choice_id', async () => {
      const dto = plainToInstance(CreateCompletedActivityDto, {
        activity_id: '821de233-ce30-41af-95c7-f46ed8887c1b',
        device_id: 'b3ccce74-d712-43c6-8dd7-f9ae9456c472',
        activity_sequence_id: '5c7e7824-dbb6-4d8d-80b3-69e214c225af',
        duration_logged: 60,
        start_time: '2025-12-02T04:43:22.024Z',
        finish_time: '2025-12-02T04:44:22.024Z',
        choice_id: 'invalid-uuid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'choice_id')).toBe(true);
    });
  });

  describe('CreateSkippedActivityDto choice_id validation', () => {
    it('should accept empty string choice_id and transform it to undefined', async () => {
      const dto = plainToInstance(CreateSkippedActivityDto, {
        activity_id: '821de233-ce30-41af-95c7-f46ed8887c1b',
        device_id: 'b3ccce74-d712-43c6-8dd7-f9ae9456c472',
        activity_sequence_id: '5c7e7824-dbb6-4d8d-80b3-69e214c225af',
        duration_logged: 60,
        start_time: '2025-12-02T04:43:22.024Z',
        finish_time: '2025-12-02T04:44:22.024Z',
        choice_id: '', // Empty string should be transformed to undefined
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.choice_id).toBeUndefined();
    });
  });

  describe('metadata validation', () => {
    it('should coerce boolean-like metadata strings for skipped activity dto', async () => {
      const dto = plainToInstance(CreateSkippedActivityDto, {
        activity_id: '821de233-ce30-41af-95c7-f46ed8887c1b',
        device_id: 'b3ccce74-d712-43c6-8dd7-f9ae9456c472',
        metadata: {
          is_skipped: 'true',
          skipped_did_not_complete: '0',
          skipped_did_complete: 'false',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.metadata).toEqual(
        expect.objectContaining({
          is_skipped: true,
          skipped_did_not_complete: false,
          skipped_did_complete: false,
        }),
      );
    });

    it('should reject invalid metadata booleans for skipped activity dto', async () => {
      const dto = plainToInstance(CreateSkippedActivityDto, {
        activity_id: '821de233-ce30-41af-95c7-f46ed8887c1b',
        device_id: 'b3ccce74-d712-43c6-8dd7-f9ae9456c472',
        metadata: {
          is_skipped: 'definitely',
        },
      });

      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'metadata')).toBe(true);
    });

    it('should reject invalid metadata booleans for completed activity dto', async () => {
      const dto = plainToInstance(CreateCompletedActivityDto, {
        activity_id: '821de233-ce30-41af-95c7-f46ed8887c1b',
        device_id: 'b3ccce74-d712-43c6-8dd7-f9ae9456c472',
        duration_logged: 60,
        start_time: '2025-12-02T04:43:22.024Z',
        finish_time: '2025-12-02T04:44:22.024Z',
        metadata: {
          skipped_did_complete: 'not-a-boolean',
        },
      });

      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'metadata')).toBe(true);
    });
  });
});
