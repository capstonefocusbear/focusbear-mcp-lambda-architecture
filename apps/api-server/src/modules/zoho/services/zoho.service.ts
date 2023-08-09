/* eslint-disable no-console */
import { BadRequestException, Injectable, UseGuards } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { getDataCenterUrl } from '../../../shared/utils/helpers';
import { CreateTaskTimeLog } from '../dto/create-task-timelog.dto';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';

@Injectable()
@UseGuards(IsAuth)
export class ZohoService {
  private readonly baseUrl = 'https://projectsapi.zoho.com.location/restapi';

  constructor(private readonly userRepository: UserRepository) {}

  private httpService = axios;

  async getUser(userId: string): Promise<User> {
    return this.userRepository.orm.findOneBy({ id: userId });
  }

  async getTaskTimeLogs(userId: string, portalId, projectId: string, taskId: string): Promise<AxiosResponse<any>> {
    try {
      const user = await this.getUser(userId);
      const url = `${
        getDataCenterUrl(user.zoho_location).api
      }/portal/${portalId}/projects/${projectId}/tasks/${taskId}/logs/`;
      const headers = { Authorization: `Bearer ${user.zoho_access_token}` };
      const response = await this.httpService.get(url, {
        headers,
      });
      return response.data;
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async addTaskTimeLog(
    userId: string,
    portalId,
    projectId: string,
    task: CreateTaskTimeLog,
  ): Promise<AxiosResponse<any>> {
    try {
      const user = await this.getUser(userId);
      const url = `${getDataCenterUrl(user.zoho_location).api}/portal/${portalId}/projects/${projectId}/tasks/${
        task.name ? `?name=${task.name}` : ''
      }`;
      const headers = { Authorization: `Bearer ${user.zoho_access_token}` };
      const tasks: any = await this.httpService.post(
        url,
        {},
        {
          headers,
        },
      );
      if (tasks?.tasks?.length > 0) {
        const tasksId = tasks.tasks[0].id_string;
        const logsUrl = `${
          getDataCenterUrl(user.zoho_location).api
        }/portal/${portalId}/projects/${projectId}/tasks/${tasksId}/logs/`;
        const logsHeaders = { Authorization: `Bearer ${user.zoho_access_token}` };
        const [year, month, day] = task.date.split('-');
        const formData = new FormData();
        formData.append('date', `${month}-${day}-${year}`);
        formData.append('bill_status', task.bill_status);
        formData.append('hours', task.hours || '00:00');
        formData.append('notes', task.notes || '');
        const response = await this.httpService.post(logsUrl, formData, {
          headers: {
            ...logsHeaders,
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      }

      return tasks.data;
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async addTimeEntry(
    userId: string,
    portalId,
    projectId: string,
    taskId: string,
    timeEntry: any,
  ): Promise<AxiosResponse<any>> {
    try {
      const user = await this.getUser(userId);
      const url = `${
        getDataCenterUrl(user.zoho_location).api
      }/portal/${portalId}/projects/${projectId}/tasks/${taskId}/logs/`;
      console.log('🚀 ~ file: portals.service.ts:92 ~ PortalsService ~ url:', url);
      const headers = { Authorization: `Bearer ${user.zoho_access_token}` };
      const [year, month, day] = timeEntry.date.split('-');
      const formData = new FormData();
      formData.append('date', `${month}-${day}-${year}`);
      formData.append('bill_status', timeEntry.bill_status);
      formData.append('hours', timeEntry.hours || '00:00');
      formData.append('notes', timeEntry.notes || '');
      const response = await this.httpService.post(url, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async getTasks(userId: string, portalId, projectId: string): Promise<any> {
    try {
      const user = await this.getUser(userId);
      const url = `${getDataCenterUrl(user.zoho_location).api}/portal/${portalId}/projects/${projectId}/tasks/`;
      const headers = { Authorization: `Bearer ${user.zoho_access_token}` };
      console.log('🚀 ~ file: portals.service.ts:71 ~ PortalsService ~ url:', url, headers);
      const response = await this.httpService.get(url, {
        headers,
      });
      console.log(response.data.tasks[0]);
      return response.data;
    } catch (e) {
      throw new BadRequestException(e.response?.data);
    }
  }

  async getProjects(userId: string, portalId: any): Promise<AxiosResponse<any>> {
    const user = await this.getUser(userId);
    const url = `${getDataCenterUrl(user.zoho_location).api}/portal/${portalId}/projects/`;
    const headers = { Authorization: `Bearer ${user.zoho_access_token}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    return response.data;
  }

  async getPortals(userId: string): Promise<AxiosResponse<any>> {
    const user = await this.getUser(userId);
    const url = `${getDataCenterUrl(user.zoho_location).api}/portals/`;
    const headers = { Authorization: `Bearer ${user.zoho_access_token}` };
    const response = await this.httpService.get(url, {
      headers,
    });
    return response.data;
  }
}
