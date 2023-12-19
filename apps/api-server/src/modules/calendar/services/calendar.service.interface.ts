export interface ICalendarService {
  updateEvents(userId, account);
  getEvents(userId, account);
  getAccounts(platform, userId);
}
