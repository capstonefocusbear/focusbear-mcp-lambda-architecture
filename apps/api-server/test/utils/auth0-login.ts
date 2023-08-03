import axios from 'axios';
import { URLSearchParams } from 'url';
import { auth0Config } from '../../src/config';

interface ILoginData {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

const buildRequestBody = (email: string, password: string): URLSearchParams => {
  const {
    management: { clientId, clientSecret },
    identifier,
    connection,
  } = auth0Config();
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', email);
  params.append('password', password);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('audience', identifier);
  params.append('connection', connection);
  return params;
};

// It works only when MFA disabled
export const auth0LoginUser = async (email: string, password: string): Promise<ILoginData> => {
  const { domain } = auth0Config();
  const body = buildRequestBody(email, password);
  const endpoint = `https://${domain}/oauth/token`;
  const { data } = await axios.post<ILoginData>(endpoint, body);
  return data;
};
