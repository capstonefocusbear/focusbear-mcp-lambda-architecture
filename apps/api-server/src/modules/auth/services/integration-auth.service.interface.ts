import { AuthorizeQuery } from '../dto/authorize-query.dto';

export interface IIntegrationAuthService {
  getLoginUrl(isDevelopment: boolean);

  authorize(userId: string, authorizeQuery: AuthorizeQuery);
}
