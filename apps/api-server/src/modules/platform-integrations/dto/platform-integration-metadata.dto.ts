export class PlatformIntegrationMetadataDto {
  client_id?: string;

  access_token?: string;

  refresh_token?: string;

  expiry_date?: number;

  account_server?: string;

  accountId?: string;

  location?: string;

  // Reauth status fields (set when account has auth issues like missing scopes)
  requires_reauth?: boolean;

  reauth_reason?: { reason: string; [key: string]: any };

  reauth_requested_at?: string;
}
