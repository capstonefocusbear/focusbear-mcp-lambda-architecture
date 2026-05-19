import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateExternalApiTokenDto } from './dto/create-external-api-token.dto';

@Injectable()
export class ExternalMcpAuthService {
  constructor(private readonly httpService: HttpService) {}

  private get baseUrl() {
    return process.env.MAIN_API_URL || 'http://api-server:4000';
  }

  async issueToken(authorization: string | undefined, dto: CreateExternalApiTokenDto) {
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/mcp/auth/tokens`, dto, {
        headers: authorization ? { authorization } : undefined,
      }),
    );
    return data;
  }

  async listTokens(authorization: string | undefined) {
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/mcp/auth/tokens`, {
        headers: authorization ? { authorization } : undefined,
      }),
    );
    return data;
  }

  async revokeToken(authorization: string | undefined, tokenId: string) {
    await firstValueFrom(
      this.httpService.delete(`${this.baseUrl}/mcp/auth/tokens/${tokenId}`, {
        headers: authorization ? { authorization } : undefined,
      }),
    );
  }

  async listAgents(authorization: string | undefined) {
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/mcp/auth/agents`, {
        headers: authorization ? { authorization } : undefined,
      }),
    );
    return data;
  }
}
