/**
 * 错误处理中间件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler, notFoundHandler } from './errorHandler.js';

describe('错误处理中间件', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      url: '/test',
      method: 'GET',
      path: '/test'
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      headersSent: false
    };
    next = vi.fn();
    
    // Mock console.error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('errorHandler', () => {
    it('应该返回500错误对于一般错误', () => {
      const error = new Error('测试错误');
      
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: '服务器内部错误'
      });
      expect(console.error).toHaveBeenCalled();
    });

    it('应该返回400错误对于验证错误', () => {
      const error = new Error('验证失败');
      error.name = 'ValidationError';
      
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: '验证失败'
      });
    });

    it('应该返回401错误对于认证错误', () => {
      const error = new Error('认证失败');
      error.name = 'UnauthorizedError';
      
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized: Invalid or missing token'
      });
    });

    it('应该返回404错误对于未找到错误', () => {
      const error = new Error('资源未找到');
      error.name = 'NotFoundError';
      
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: '资源未找到'
      });
    });

    it('应该使用错误对象的status属性', () => {
      const error = new Error('自定义错误');
      error.status = 422;
      
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        error: '自定义错误'
      });
    });

    it('应该在开发环境中显示详细错误信息', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('详细错误信息');
      
      errorHandler(error, req, res, next);
      
      expect(res.json).toHaveBeenCalledWith({
        error: '详细错误信息'
      });
      
      process.env.NODE_ENV = originalEnv;
    });

    it('应该在响应已发送时调用next', () => {
      res.headersSent = true;
      const error = new Error('测试错误');
      
      errorHandler(error, req, res, next);
      
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('应该记录错误日志', () => {
      const error = new Error('测试错误');
      
      errorHandler(error, req, res, next);
      
      expect(console.error).toHaveBeenCalledWith(
        '全局错误处理器捕获错误:',
        expect.objectContaining({
          message: '测试错误',
          stack: expect.any(String),
          url: '/test',
          method: 'GET',
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('应该返回404错误对于未找到的路由', () => {
      notFoundHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Route GET /test not found'
      });
    });

    it('应该处理不同的HTTP方法', () => {
      req.method = 'POST';
      req.path = '/api/unknown';
      
      notFoundHandler(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        error: 'Route POST /api/unknown not found'
      });
    });
  });
});