/**
 * 认证中间件单元测试
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import authMiddleware from './auth.js';

describe('认证中间件', () => {
  let req, res, next;

  beforeAll(() => {
    // 确保在导入模块前设置环境变量
    process.env.API_TOKEN = 'test-token';
  });

  beforeEach(() => {
    // 模拟 Express 请求、响应和 next 函数
    req = {
      headers: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  it('应该在提供有效 Bearer Token 时放行请求', () => {
    req.headers.authorization = 'Bearer test-token-123';
    
    authMiddleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('应该在缺失 Authorization 头时返回 401', () => {
    authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Invalid or missing token'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('应该在 Authorization 头格式错误时返回 401', () => {
    req.headers.authorization = 'InvalidFormat test-token-123';
    
    authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Invalid or missing token'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('应该在只有 Bearer 没有 token 时返回 401', () => {
    req.headers.authorization = 'Bearer';
    
    authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Invalid or missing token'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('应该在 token 无效时返回 401', () => {
    req.headers.authorization = 'Bearer invalid-token';
    
    authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Invalid or missing token'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('应该在 Authorization 头为空字符串时返回 401', () => {
    req.headers.authorization = '';
    
    authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Invalid or missing token'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('应该在 token 包含额外空格时返回 401', () => {
    req.headers.authorization = 'Bearer test-token extra';
    
    authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Invalid or missing token'
    });
    expect(next).not.toHaveBeenCalled();
  });
});
