export class AdminTrackEventResponseDto {
  id: string;

  event_name: string;

  event_data: Record<string, unknown> | null;

  created_at: string;
}
