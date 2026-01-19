/**
 * Token 验证中间件
 * 验证请求头中的 Bearer Token
 */

import config from '../config.js';

/**
 * 认证中间件
 * 验证 Authorization 头中的 Bearer Token
 * 
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - Express next 函数
 */
function authMiddleware(req, res, next) {
  // 从 Authorization 头提取 token
  const authHeader = req.headers.authorization;
  
  // 检查 Authorization 头是否存在
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing token'
    });
  }
  
  // 检查是否为 Bearer Token 格式
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing token'
    });
  }
  
  const token = parts[1];
  
  // 验证 token 是否与配置的 API_TOKEN 匹配
  if (token !== config.apiToken) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing token'
    });
  }
  
  // Token 验证通过，继续处理请求
  next();
}

export default authMiddleware;
