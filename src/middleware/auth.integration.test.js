/**
 * 认证中间件集成测试
 * 测试认证中间件与 Express 应用的集成
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('认证中间件集成测试', () => {
  let app;
  const testToken = 'test-token-123';

  beforeAll(async () => {
    // 设置测试环境变量
    vi.stubEnv('API_TOKEN', testToken);
    
    // 动态导入以确保使用模拟的环境变量
    const { default: authMiddleware } = await import('./auth.js');
    
    // 创建测试用的 Express 应用
    app = express();
    
    // 注册认证中间件到所有路由
    app.use(authMiddleware);
    
    // 创建测试路由
    app.get('/protected', (req, res) => {
      res.json({ message: 'Access granted' });
    });
  });

  it('应该在提供有效 token 时允许访问受保护的路由', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);
    
    expect(response.body).toEqual({ message: 'Access granted' });
  });

  it('应该在缺失 Authorization 头时拒绝访问', async () => {
    const response = await request(app)
      .get('/protected')
      .expect(401);
    
    expect(response.body).toEqual({
      error: 'Unauthorized: Invalid or missing token'
    });
  });

  it('应该在提供无效 token 时拒绝访问', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
    
    expect(response.body).toEqual({
      error: 'Unauthorized: Invalid or missing token'
    });
  });

  it('应该在 Authorization 头格式错误时拒绝访问', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'InvalidFormat token')
      .expect(401);
    
    expect(response.body).toEqual({
      error: 'Unauthorized: Invalid or missing token'
    });
  });

  it('应该在只有 Bearer 关键字时拒绝访问', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer')
      .expect(401);
    
    expect(response.body).toEqual({
      error: 'Unauthorized: Invalid or missing token'
    });
  });
});
