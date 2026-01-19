/**
 * 应用入口
 * 初始化 Express 服务器并监听配置的端口
 */

import express from 'express';
import config from './config.js';
import authMiddleware from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { parseEmailHandler } from './controllers/parse.js';
import { downloadAttachmentHandler } from './controllers/attachment.js';
import { startCleanupTimer, stopCleanupTimer } from './utils/cleanup.js';

// 创建 Express 应用实例
const app = express();

// 解析原始二进制数据
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// 健康检查端点（不需要认证）
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 注册认证中间件，保护所有后续路由
app.use(authMiddleware);

// 注册邮件解析路由
app.post('/parse', parseEmailHandler);

// 注册附件下载路由
app.get('/attachments/:id', downloadAttachmentHandler);

// 404 错误处理中间件（必须在所有路由之后）
app.use(notFoundHandler);

// 全局错误处理中间件（必须在最后）
app.use(errorHandler);

// 启动服务器
const server = app.listen(config.port, () => {
  console.log(`邮件解析服务已启动，监听端口: ${config.port}`);
  
  // 启动附件清理定时器
  startCleanupTimer();
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  
  // 停止清理定时器
  stopCleanupTimer();
  
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  
  // 停止清理定时器
  stopCleanupTimer();
  
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

export default app;
