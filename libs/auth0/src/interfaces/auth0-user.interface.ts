export interface Auth0Identity {
  user_id?: string;
  provider?: string;
  connection?: string;
  isSocial?: boolean;
}

export interface Auth0User {
  created_at?: string;
  email?: string;
  email_verified?: boolean;
  identities?: Auth0Identity[];
  name?: string;
  nickname?: string;
  picture?: string;
  updated_at?: string;
  user_id?: string;
  last_ip?: string;
  last_login?: string;
  logins_count?: number;
  given_name?: string;
  family_name?: string;
}
