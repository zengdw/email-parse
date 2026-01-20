/**
 * 配置模块
 * 负责读取和验证环境变量配置
 */

import dotenv from 'dotenv';

// 加载 .env 文件
dotenv.config();

const config = {
  // 服务监听端口
  port: parseInt(process.env.PORT || '3000', 10),
  
  // 服务域名（用于生成完整的下载链接URL）
  domain: process.env.DOMAIN || 'http://localhost:3000',
  
  // 接口验证 Token（必填）
  apiToken: process.env.API_TOKEN,
  
  // 附件过期时间（毫秒）
  attachmentTtl: parseInt(process.env.ATTACHMENT_TTL || '3600000', 10),
  
  // 临时下载token过期时间（毫秒，默认5分钟）
  tempTokenTtl: parseInt(process.env.TEMP_TOKEN_TTL || '300000', 10),
  
  // 单个附件大小限制（字节）
  maxAttachmentSize: parseInt(process.env.MAX_ATTACHMENT_SIZE || '10485760', 10),
  
  // 请求体大小限制（字符串格式，如 '50mb'）
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '50mb',
  
  // 附件存储目录
  attachmentDir: process.env.ATTACHMENT_DIR || './attachments'
};

// 验证必填配置
if (!config.apiToken) {
  throw new Error('API_TOKEN environment variable is required');
}

export default config;
