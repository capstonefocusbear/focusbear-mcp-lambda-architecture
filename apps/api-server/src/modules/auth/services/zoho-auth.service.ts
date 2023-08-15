import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { ZohoAuthorizeQuery } from '../dto/zoho-authorize-query.dto';

@Injectable()
export class ZohoAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  getZohoLoginUrl() {
    const scopes = [
      'AaaServer.profile.Read',
      'ZohoProjects.tasks.ALL',
      'ZohoProjects.projects.ALL',
      'ZohoProjects.portals.ALL',
      'ZohoProjects.timesheets.ALL',
    ];

    let queryParams: any = {
      scope: scopes.join(','),
      client_id: this.configService.get('zoho.ZOHO_CLIENT_ID'),
      client_secret: this.configService.get('zoho.ZOHO_CLIENT_SECRET'),
      redirect_uri: this.configService.get('zoho.ZOHO_CALLBACK_URL'),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    };
    // convert queryParams to query string
    queryParams = Object.keys(queryParams)
      .map((key) => `${key}=${queryParams[key]}`)
      .join('&');
    return { redirect_url: `https://accounts.zoho.com.au/oauth/v2/auth?${queryParams}` };
  }

  async validateUser(user: any): Promise<any> {
    const { userId, accessToken, refreshToken, location, accountServer } = user;
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new NotFoundException(`User with ID: ${userId} not found!`);
    }
    const detailPayload = {
      zoho_refresh_token: refreshToken || '',
      zoho_access_token: accessToken || '',
      ...(location && { zoho_location: location }),
      ...(accountServer && { zoho_account_server: accountServer }),
    };

    // Update the user's access token and refresh token
    await this.userRepository.update(existingUser.id, detailPayload);
    return existingUser;

    // DON'T THINK FEATURE WILL BE AVAILABLE TO UNREGISTERED USERS?
    // Create a new user
    // const newUser = await this.userService.create({
    //   ...detailPayload,
    // });
    // return newUser;
  }

  async refreshToken(userId: string) {
    // const { refreshToken, accountServer } = user;
    const user = await this.getUser(userId);
    const url = `${user.zoho_account_server}/oauth/v2/token?client_id=${this.configService.get(
      'zoho.ZOHO_CLIENT_ID',
    )}&grant_type=refresh_token&client_secret=${this.configService.get('zoho.ZOHO_CLIENT_SECRET')}&refresh_token=${
      user.zoho_refresh_token
    }`;
    const { data } = await axios.post(url);
    await this.userRepository.update(userId, { zoho_access_token: data?.access_token || '' });
    return data;
  }

  async authorize(userId: string, zohoAuthorizeQuery: ZohoAuthorizeQuery) {
    try {
      const { code, location, 'accounts-server': accountServer } = zohoAuthorizeQuery;

      const url = `${accountServer}/oauth/v2/token?client_id=${this.configService.get(
        'zoho.ZOHO_CLIENT_ID',
      )}&grant_type=authorization_code&client_secret=${this.configService.get(
        'zoho.ZOHO_CLIENT_SECRET',
      )}&redirect_uri=${this.configService.get('zoho.ZOHO_CALLBACK_URL')}&code=${code}`;

      const { data } = await axios.post(url);
      const user = await this.validateUser({
        userId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        location,
        accountServer,
      });
      const payload = { sub: user.id };
      return {
        access_token: await this.jwtService.signAsync(payload, {
          expiresIn: data.expires_in,
        }),
      };
    } catch (error) {
      console.error(error);
    }
  }

  async login(userId: string, query: Record<string, any>) {
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new NotFoundException(`User with ID: ${userId} not found!`);
    }
    const updatePayload = {
      ...(query.api_domain && { api_domain: query.api_domain }),
      ...(query.location && { zoho_location: query.location }),
      ...(query['accounts-server'] && {
        zoho_account_server: query['accounts-server'],
      }),
    };
    // existingUser.apiDomain = apiDomain;
    await this.userRepository.update(existingUser.id, {
      ...updatePayload,
    });
    const payload = { sub: existingUser.id };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }
}
