import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable()
export class ZohoDeskService {
  private accessToken: string | null = null;

  private refreshToken: string | null = null;

  private tokenExpiryTime: number | null = null;

  private readonly clientId: string;

  private readonly clientSecret: string;

  private readonly orgId: string;

  private readonly whatsappChannelId: string;

  private readonly deskBaseUrl: string;

  private readonly accountsBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('zoho.ZOHO_DESK_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('zoho.ZOHO_DESK_CLIENT_SECRET') || '';
    this.orgId = this.configService.get<string>('zoho.ZOHO_ORG_ID') || '';
    this.whatsappChannelId = this.configService.get<string>('zoho.ZOHO_WHATSAPP_CHANNEL_ID') || '';
    this.refreshToken = this.configService.get<string>('zoho.ZOHO_REFRESH_TOKEN') || '';
    this.deskBaseUrl = this.configService.get<string>('zoho.ZOHO_DESK_BASE_URL') || 'https://desk.zoho.com.au';
    this.accountsBaseUrl =
      this.configService.get<string>('zoho.ZOHO_ACCOUNTS_BASE_URL') || 'https://accounts.zoho.com.au';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiryTime && Date.now() < this.tokenExpiryTime) {
      return this.accessToken;
    }

    try {
      const tokenUrl = `${this.accountsBaseUrl}/oauth/v2/token`;
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        scope: 'Desk.InstantMessages.ALL,Desk.tickets.ALL,Desk.basic.ALL',
      });

      const response = await axios.post<TokenResponse>(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokenData = response.data;
      this.accessToken = tokenData.access_token;
      this.tokenExpiryTime = Date.now() + (tokenData.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (_error) {
      throw new Error('Failed to authenticate with Zoho API');
    }
  }

  async initiateWhatsAppSession(
    phoneNumber: string,
    language: string,
    cannedMessageId: number,
    message: string,
  ): Promise<any> {
    try {
      // Validate required configuration & parameters early to avoid opaque 404s
      if (!this.orgId) {
        throw new Error('Missing Zoho Desk orgId configuration');
      }
      if (!this.whatsappChannelId) {
        throw new Error('Missing Zoho WhatsApp channel ID configuration');
      }
      if (!this.clientId || !this.clientSecret || !this.refreshToken) {
        throw new Error('Missing Zoho Desk OAuth credentials or refresh token');
      }
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }
      if (!language) {
        throw new Error('Language is required');
      }
      if (!Number.isFinite(cannedMessageId)) {
        throw new Error('Invalid cannedMessageId');
      }

      // Get valid access token
      const accessToken = await this.getAccessToken();

      // Construct the API endpoint
      const apiUrl = `${this.deskBaseUrl}/api/v1/im/channels/${this.whatsappChannelId}/initiateSession`;

      // Construct the request body according to Zoho Desk API documentation
      const requestBody = {
        receiverId: phoneNumber,
        receiverType: 'PHONENUMBER',
        cannedMessageId,
        language,
        message,
      };

      // Make the POST request
      const headers = {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        orgId: this.orgId,
        'Content-Type': 'application/json',
      };

      const response = await axios.post(apiUrl, requestBody, {
        headers,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to initiate WhatsApp session: ${error.response?.status} - ${
            error.response?.data?.message || error.message
          }${error.config?.url ? ` (url: ${error.config.url})` : ''}`,
        );
      }

      throw error;
    }
  }
}
