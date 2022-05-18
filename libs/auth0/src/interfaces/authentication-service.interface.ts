export interface IAuthenticationService {
  validateAccessToken(token: string): Promise<[boolean, { payload?: any; declineReason?: string }]>;
}
