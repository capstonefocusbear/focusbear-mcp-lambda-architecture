export enum EventTypes {
  APP_QUIT = 'app-quit',
  GIVE_ME_4HR_BREAK = 'give-me-4hr-break',
}

export const EVENT_TYPES_TO_ALERT_IN_SLACK = [EventTypes.APP_QUIT, EventTypes.GIVE_ME_4HR_BREAK];
