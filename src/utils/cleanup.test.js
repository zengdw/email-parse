/**
 * 清理工具测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  performCleanup, 
  startCleanupTimer, 
  stopCleanupTimer, 
  isCleanupTimerRunning 
} from './cleanup.js';
import * as attachmentStorage from '../services/attachmentStorage.js';

// Mock 附件存储服务
vi.mock('../services/attachmentStorage.js', () => ({
  cleanupExpiredAttachments: vi.fn()
}));

// Mock console 方法
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
};

describe('清理工具', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 确保每个测试开始时定时器都是停止的
    stopCleanupTimer();
  });

  afterEach(() => {
    // 清理定时器
    stopCleanupTimer();
  });

  describe('performCleanup', () => {
    it('应该调用附件存储服务的清理方法', async () => {
      // 安排
      attachmentStorage.cleanupExpiredAttachments.mockResolvedValue(3);

      // 执行
      await performCleanup();

      // 断言
      expect(attachmentStorage.cleanupExpiredAttachments).toHaveBeenCalledOnce();
      expect(consoleSpy.log).toHaveBeenCalledWith('清理完成：删除了 3 个过期附件');
    });

    it('当没有过期附件时不应该输出日志', async () => {
      // 安排
      attachmentStorage.cleanupExpiredAttachments.mockResolvedValue(0);

      // 执行
      await performCleanup();

      // 断言
      expect(attachmentStorage.cleanupExpiredAttachments).toHaveBeenCalledOnce();
      expect(consoleSpy.log).not.toHaveBeenCalledWith(expect.stringContaining('清理完成'));
    });

    it('应该处理清理过程中的错误', async () => {
      // 安排
      const error = new Error('清理失败');
      attachmentStorage.cleanupExpiredAttachments.mockRejectedValue(error);

      // 执行
      await performCleanup();

      // 断言
      expect(consoleSpy.error).toHaveBeenCalledWith('清理过期附件时发生错误:', error);
    });
  });

  describe('startCleanupTimer', () => {
    it('应该启动定时器并立即执行一次清理', async () => {
      // 安排
      attachmentStorage.cleanupExpiredAttachments.mockResolvedValue(0);

      // 执行
      startCleanupTimer();

      // 断言
      expect(isCleanupTimerRunning()).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith('启动附件清理定时器，每 10 分钟执行一次清理');
      
      // 等待立即执行的清理完成
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(attachmentStorage.cleanupExpiredAttachments).toHaveBeenCalledOnce();
    });

    it('应该在启动新定时器前停止现有定时器', () => {
      // 执行
      startCleanupTimer();
      const firstTimerRunning = isCleanupTimerRunning();
      
      startCleanupTimer();
      const secondTimerRunning = isCleanupTimerRunning();

      // 断言
      expect(firstTimerRunning).toBe(true);
      expect(secondTimerRunning).toBe(true);
      // 应该有：2次启动日志 + 1次停止日志（第二次启动时停止第一个定时器）
      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
    });
  });

  describe('stopCleanupTimer', () => {
    it('应该停止正在运行的定时器', () => {
      // 安排
      startCleanupTimer();
      expect(isCleanupTimerRunning()).toBe(true);

      // 执行
      stopCleanupTimer();

      // 断言
      expect(isCleanupTimerRunning()).toBe(false);
      expect(consoleSpy.log).toHaveBeenCalledWith('附件清理定时器已停止');
    });

    it('当没有运行的定时器时应该安全处理', () => {
      // 执行
      stopCleanupTimer();

      // 断言
      expect(isCleanupTimerRunning()).toBe(false);
      expect(consoleSpy.log).not.toHaveBeenCalledWith('附件清理定时器已停止');
    });
  });

  describe('isCleanupTimerRunning', () => {
    it('应该正确报告定时器状态', () => {
      // 初始状态
      expect(isCleanupTimerRunning()).toBe(false);

      // 启动后
      startCleanupTimer();
      expect(isCleanupTimerRunning()).toBe(true);

      // 停止后
      stopCleanupTimer();
      expect(isCleanupTimerRunning()).toBe(false);
    });
  });
});