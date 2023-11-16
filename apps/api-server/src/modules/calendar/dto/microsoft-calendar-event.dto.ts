interface Location {
  displayName: string;
  locationType: string;
  uniqueIdType: string;
}

export class MicrosoftCalendarEventDto {
  '@odata.etag'?: string;

  id: string;

  subject: string;

  bodyPreview: string;

  body: {
    contentType: string;
    content: string;
  };

  isAllDay: boolean;

  start: {
    dateTime: string;
    timeZone: string;
  };

  end: {
    dateTime: string;
    timeZone: string;
  };

  location: {
    displayName: string;
    locationType: string;
    uniqueId: string;
    uniqueIdType: string;
  };

  locations: Location[];
}
