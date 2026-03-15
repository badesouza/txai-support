/**
 * API Test Client
 * Works with both local and cloud environments
 */

import request from 'supertest';

export interface TestConfig {
  apiUrl: string;
  adminEmail: string;
  adminPassword: string;
  isCloud: boolean;
}

export function getTestConfig(): TestConfig {
  const apiUrl = process.env.API_URL || 'http://localhost:3001/api';
  return {
    apiUrl,
    adminEmail: process.env.TEST_ADMIN_EMAIL || 'admin@txai.com',
    adminPassword: process.env.TEST_ADMIN_PASSWORD || 'admin123',
    isCloud: apiUrl.includes('run.app') || apiUrl.includes('.web.app')
  };
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getTestConfig().apiUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async get(path: string): Promise<request.Response> {
    return request(this.baseUrl)
      .get(path)
      .set(this.getHeaders());
  }

  async post(path: string, data?: object): Promise<request.Response> {
    return request(this.baseUrl)
      .post(path)
      .set(this.getHeaders())
      .send(data);
  }

  async put(path: string, data?: object): Promise<request.Response> {
    return request(this.baseUrl)
      .put(path)
      .set(this.getHeaders())
      .send(data);
  }

  async patch(path: string, data?: object): Promise<request.Response> {
    return request(this.baseUrl)
      .patch(path)
      .set(this.getHeaders())
      .send(data);
  }

  async delete(path: string): Promise<request.Response> {
    return request(this.baseUrl)
      .delete(path)
      .set(this.getHeaders());
  }

  // Authentication helpers
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await this.post('/users/login', { email, password });
    if (response.status === 200 && response.body.token) {
      this.token = response.body.token;
    }
    return response.body;
  }

  async register(data: { name: string; email: string; password: string; phone: string; profile?: string }): Promise<{ token: string; user: any }> {
    const response = await this.post('/users/register', data);
    if (response.status === 201 && response.body.token) {
      this.token = response.body.token;
    }
    return response.body;
  }

  async loginAsAdmin(): Promise<{ token: string; user: any }> {
    const config = getTestConfig();
    return this.login(config.adminEmail, config.adminPassword);
  }
}



