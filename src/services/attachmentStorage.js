/**
 * 附件存储服务
 * 管理附件的存储和检索
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';

/**
 * 附件元数据存储（内存中维护）
 * 格式: { [attachmentId]: { filename, mimeType, size, filePath, createdAt } }
 */
const attachmentMetadata = new Map();

/**
 * 临时下载token存储（内存中维护）
 * 格式: { [tempToken]: { attachmentId, createdAt } }
 */
const tempTokens = new Map();

/**
 * 确保附件存储目录存在
 */
async function ensureAttachmentDir() {
  try {
    await fs.access(config.attachmentDir);
  } catch (error) {
    // 目录不存在，创建它
    await fs.mkdir(config.attachmentDir, { recursive: true });
  }
}

/**
 * 检查附件大小是否超过限制
 * @param {number} size - 附件大小（字节）
 * @returns {boolean} 是否超过限制
 */
function isAttachmentSizeExceeded(size) {
  return size > config.maxAttachmentSize;
}

/**
 * 生成附件大小超限的跳过原因
 * @param {number} size - 附件大小（字节）
 * @returns {string} 跳过原因
 */
function getSkipReason(size) {
  const sizeMB = (size / (1024 * 1024)).toFixed(1);
  const limitMB = (config.maxAttachmentSize / (1024 * 1024)).toFixed(1);
  return `Attachment size exceeds limit (${sizeMB}MB > ${limitMB}MB)`;
}

/**
 * 保存附件到文件系统
 * @param {Buffer} content - 附件内容
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME类型
 * @returns {Promise<{id: string, downloadUrl: string}>} 附件ID和下载URL
 */
async function saveAttachment(content, filename, mimeType) {
  // 确保存储目录存在
  await ensureAttachmentDir();
  
  // 生成唯一ID
  const attachmentId = uuidv4();
  
  // 构建文件路径
  const filePath = path.join(config.attachmentDir, attachmentId);
  
  // 写入文件
  await fs.writeFile(filePath, content);
  
  // 记录元数据
  attachmentMetadata.set(attachmentId, {
    filename,
    mimeType,
    size: content.length,
    filePath,
    createdAt: Date.now()
  });
  
  return {
    id: attachmentId,
    downloadUrl: `/attachments/${attachmentId}`
  };
}

/**
 * 根据ID检索附件
 * @param {string} attachmentId - 附件ID
 * @returns {Promise<{metadata: object, content: Buffer} | null>} 附件元数据和内容，如果不存在返回null
 */
async function getAttachment(attachmentId) {
  const metadata = attachmentMetadata.get(attachmentId);
  
  if (!metadata) {
    return null;
  }
  
  // 检查是否过期
  const now = Date.now();
  const isExpired = (now - metadata.createdAt) > config.attachmentTtl;
  
  if (isExpired) {
    // 清理过期附件
    await cleanupAttachment(attachmentId);
    return null;
  }
  
  try {
    // 读取文件内容
    const content = await fs.readFile(metadata.filePath);
    return { metadata, content };
  } catch (error) {
    // 文件不存在，清理元数据
    attachmentMetadata.delete(attachmentId);
    return null;
  }
}

/**
 * 清理单个附件
 * @param {string} attachmentId - 附件ID
 */
async function cleanupAttachment(attachmentId) {
  const metadata = attachmentMetadata.get(attachmentId);
  
  if (metadata) {
    try {
      // 删除文件
      await fs.unlink(metadata.filePath);
    } catch (error) {
      // 文件可能已经不存在，忽略错误
    }
    
    // 删除元数据
    attachmentMetadata.delete(attachmentId);
  }
}

/**
 * 清理所有过期附件
 */
async function cleanupExpiredAttachments() {
  const now = Date.now();
  const expiredIds = [];
  
  // 找出所有过期的附件ID
  for (const [id, metadata] of attachmentMetadata.entries()) {
    if ((now - metadata.createdAt) > config.attachmentTtl) {
      expiredIds.push(id);
    }
  }
  
  // 清理过期附件
  for (const id of expiredIds) {
    await cleanupAttachment(id);
  }
  
  return expiredIds.length;
}

/**
 * 生成临时下载token
 * @param {string} attachmentId - 附件ID
 * @returns {string} 临时token
 */
function generateTempToken(attachmentId) {
  const tempToken = uuidv4();
  tempTokens.set(tempToken, {
    attachmentId,
    createdAt: Date.now()
  });
  return tempToken;
}

/**
 * 验证临时token并获取附件ID
 * @param {string} tempToken - 临时token
 * @returns {string | null} 附件ID，如果token无效或过期返回null
 */
function validateTempToken(tempToken) {
  const tokenData = tempTokens.get(tempToken);
  
  if (!tokenData) {
    return null;
  }
  
  // 检查是否过期
  const now = Date.now();
  const isExpired = (now - tokenData.createdAt) > config.tempTokenTtl;
  
  if (isExpired) {
    // 清理过期token
    tempTokens.delete(tempToken);
    return null;
  }
  
  return tokenData.attachmentId;
}

/**
 * 清理过期的临时token
 */
function cleanupExpiredTempTokens() {
  const now = Date.now();
  const expiredTokens = [];
  
  // 找出所有过期的token
  for (const [token, tokenData] of tempTokens.entries()) {
    if ((now - tokenData.createdAt) > config.tempTokenTtl) {
      expiredTokens.push(token);
    }
  }
  
  // 清理过期token
  for (const token of expiredTokens) {
    tempTokens.delete(token);
  }
  
  return expiredTokens.length;
}

/**
 * 获取附件元数据（不包含内容）
 * @param {string} attachmentId - 附件ID
 * @returns {object | null} 附件元数据，如果不存在或过期返回null
 */
function getAttachmentMetadata(attachmentId) {
  const metadata = attachmentMetadata.get(attachmentId);
  
  if (!metadata) {
    return null;
  }
  
  // 检查是否过期
  const now = Date.now();
  const isExpired = (now - metadata.createdAt) > config.attachmentTtl;
  
  if (isExpired) {
    return null;
  }
  
  return metadata;
}

export {
  isAttachmentSizeExceeded,
  getSkipReason,
  saveAttachment,
  getAttachment,
  cleanupAttachment,
  cleanupExpiredAttachments,
  getAttachmentMetadata,
  generateTempToken,
  validateTempToken,
  cleanupExpiredTempTokens
};