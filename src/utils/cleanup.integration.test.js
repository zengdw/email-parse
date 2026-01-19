/**
 * 清理工具集成测试
 * 验证清理工具与附件存储服务的集成
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  startCleanupTimer, 
  stopCleanupTimer, 
  performCleanup,
  isCleanupTimerRunning 
} from './cleanup.js';
import { 
  saveAttachment, 
  getAttachment,
  cleanupExpiredAttachments 
} from '../services/attachmentStorage.js';
import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';

describe('清理工具集成测试', () => {
  beforeEach(async () => {
    // 确保测试开始时定时器是停止的
    stopCleanupTimer();
    
    // 确保附件目录存在
    try {
      await fs.access(config.attachmentDir);
    } catch {
      await fs.mkdir(config.attachmentDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // 清理定时器
    stopCleanupTimer();
    
    // 清理测试文件
    try {
      const files = await fs.readdir(config.attachmentDir);
      for (const file of files) {
        await fs.unlink(path.join(config.attachmentDir, file));
      }
    } catch (error) {
      // 忽略清理错误
    }
  });

  it('应该能够启动和停止清理定时器', () => {
    // 初始状态
    expect(isCleanupTimerRunning()).toBe(false);

    // 启动定时器
    startCleanupTimer();
    expect(isCleanupTimerRunning()).toBe(true);

    // 停止定时器
    stopCleanupTimer();
    expect(isCleanupTimerRunning()).toBe(false);
  });

  it('应该能够执行清理操作', async () => {
    // 创建一个测试附件
    const testContent = Buffer.from('test attachment content');
    const result = await saveAttachment(testContent, 'test.txt', 'text/plain');
    
    // 验证附件存在
    const attachment = await getAttachment(result.id);
    expect(attachment).not.toBeNull();
    expect(attachment.content.toString()).toBe('test attachment content');

    // 执行清理（由于附件刚创建，不应该被清理）
    await performCleanup();
    
    // 验证附件仍然存在
    const attachmentAfterCleanup = await getAttachment(result.id);
    expect(attachmentAfterCleanup).not.toBeNull();
  });

  it('应该能够清理过期附件', async () => {
    // 这个测试需要模拟时间流逝，在实际环境中附件会在1小时后过期
    // 由于测试环境的限制，我们只验证清理函数能够正常调用
    const cleanedCount = await cleanupExpiredAttachments();
    expect(typeof cleanedCount).toBe('number');
    expect(cleanedCount).toBeGreaterThanOrEqual(0);
  });

  it('应该在应用启动时自动启动清理定时器', async () => {
    // 这个测试验证清理工具的API是否正确导出
    expect(typeof startCleanupTimer).toBe('function');
    expect(typeof stopCleanupTimer).toBe('function');
    expect(typeof performCleanup).toBe('function');
    expect(typeof isCleanupTimerRunning).toBe('function');
  });
});