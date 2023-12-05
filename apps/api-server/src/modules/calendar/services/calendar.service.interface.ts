export interface ICalendarService {
  updateEvents(userId);
  getEvents(userId);
  getAccounts(platform, userId);
}
