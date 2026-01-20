/**
 * 过期文件清理工具
 * 定期清理过期的附件文件
 */

import { cleanupExpiredAttachments, cleanupExpiredTempTokens } from '../services/attachmentStorage.js';

/**
 * 清理定时器实例
 */
let cleanupTimer = null;

/**
 * 执行清理操作
 * 清理所有过期的附件文件和临时token
 */
async function performCleanup() {
  try {
    const cleanedAttachments = await cleanupExpiredAttachments();
    const cleanedTokens = cleanupExpiredTempTokens();
    
    if (cleanedAttachments > 0 || cleanedTokens > 0) {
      console.log(`清理完成：删除了 ${cleanedAttachments} 个过期附件，${cleanedTokens} 个过期临时token`);
    }
  } catch (error) {
    console.error('清理过期文件时发生错误:', error);
  }
}

/**
 * 启动清理定时器
 * 每 10 分钟执行一次清理操作
 */
function startCleanupTimer() {
  // 如果定时器已经存在，先停止它
  if (cleanupTimer) {
    stopCleanupTimer();
  }
  
  // 10 分钟 = 10 * 60 * 1000 毫秒
  const CLEANUP_INTERVAL = 10 * 60 * 1000;
  
  console.log('启动附件清理定时器，每 10 分钟执行一次清理');
  
  // 立即执行一次清理
  performCleanup();
  
  // 设置定时器
  cleanupTimer = setInterval(performCleanup, CLEANUP_INTERVAL);
}

/**
 * 停止清理定时器
 */
function stopCleanupTimer() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('附件清理定时器已停止');
  }
}

/**
 * 获取定时器状态
 * @returns {boolean} 定时器是否正在运行
 */
function isCleanupTimerRunning() {
  return cleanupTimer !== null;
}

export {
  performCleanup,
  startCleanupTimer,
  stopCleanupTimer,
  isCleanupTimerRunning
};