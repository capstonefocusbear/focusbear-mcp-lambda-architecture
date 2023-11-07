import { AuthorizeQuery } from '../dto/authorize-query.dto';

export interface IIntegrationAuthService {
  getLoginUrl();

  authorize(userId: string, authorizeQuery: AuthorizeQuery);
}
