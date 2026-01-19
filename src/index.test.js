/**
 * 应用入口单元测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';

describe('Express 应用入口', () => {
  beforeAll(() => {
    // 确保环境变量已设置（通过 vitest.config.js）
    if (!process.env.API_TOKEN) {
      process.env.API_TOKEN = 'test-token';
    }
  });

  it('应该成功创建 Express 应用实例', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  it('应该响应健康检查端点', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('应该能够处理 application/octet-stream 类型的请求', async () => {
    const testData = Buffer.from('test data');
    
    // 提供有效 token，测试中间件是否正确配置
    // 由于请求体不是有效的邮件格式，预期会返回 400
    await request(app)
      .post('/parse')
      .set('Authorization', 'Bearer test-token-123')
      .set('Content-Type', 'application/octet-stream')
      .send(testData)
      .expect(400);
  });

  describe('认证中间件注册', () => {
    it('健康检查端点不需要认证', async () => {
      // 不提供 token，应该仍然可以访问健康检查端点
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toEqual({ status: 'ok' });
    });

    it('其他端点需要认证 - 缺少 token 时返回 401', async () => {
      // 尝试访问一个不存在的端点，但应该先被认证中间件拦截
      const response = await request(app)
        .get('/some-protected-route')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('其他端点需要认证 - 提供有效 token 时可以通过认证', async () => {
      // 提供有效 token，应该通过认证（虽然路由不存在会返回 404）
      await request(app)
        .get('/some-protected-route')
        .set('Authorization', 'Bearer test-token-123')
        .expect(404); // 路由不存在，但已通过认证
    });

    it('POST /parse 端点需要认证', async () => {
      const testData = Buffer.from('test data');
      
      // 不提供 token，应该返回 401
      const response = await request(app)
        .post('/parse')
        .set('Content-Type', 'application/octet-stream')
        .send(testData)
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });
  });
});
