/**
 * 错误处理中间件集成测试
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import config from '../config.js';

describe('错误处理集成测试', () => {
  const testToken = config.apiToken;

  describe('404 错误处理', () => {
    it('应该对未知路由返回404错误', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Route GET /unknown-route not found'
      });
    });

    it('应该对未知POST路由返回404错误', async () => {
      const response = await request(app)
        .post('/unknown-post-route')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Route POST /unknown-post-route not found'
      });
    });
  });

  describe('认证错误处理', () => {
    it('应该对缺失token返回401错误', async () => {
      const response = await request(app)
        .post('/parse')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Unauthorized: Invalid or missing token'
      });
    });

    it('应该对无效token返回401错误', async () => {
      const response = await request(app)
        .post('/parse')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Unauthorized: Invalid or missing token'
      });
    });
  });

  describe('邮件解析错误处理', () => {
    it('应该对空请求体返回400错误', async () => {
      const response = await request(app)
        .post('/parse')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/octet-stream')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('应该对无效邮件格式返回400错误', async () => {
      const response = await request(app)
        .post('/parse')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/octet-stream')
        .send(Buffer.from('invalid email content'))
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('附件下载错误处理', () => {
    it('应该对不存在的附件返回404错误', async () => {
      const response = await request(app)
        .get('/attachments/non-existent-id')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Attachment not found or expired'
      });
    });
  });

  describe('错误响应格式一致性', () => {
    it('所有错误响应都应该包含error字段', async () => {
      const testCases = [
        { method: 'get', path: '/unknown', token: testToken, expectedStatus: 404 },
        { method: 'post', path: '/parse', expectedStatus: 401 },
        { method: 'get', path: '/attachments/invalid', token: testToken, expectedStatus: 404 }
      ];

      for (const testCase of testCases) {
        let request_builder = request(app)[testCase.method](testCase.path);
        
        if (testCase.token) {
          request_builder = request_builder.set('Authorization', `Bearer ${testCase.token}`);
        }
        
        const response = await request_builder.expect(testCase.expectedStatus);

        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
        expect(response.body.error.length).toBeGreaterThan(0);
      }
    });
  });
});