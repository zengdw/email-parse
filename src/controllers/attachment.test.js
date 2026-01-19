/**
 * 附件控制器单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadAttachmentHandler } from './attachment.js';

// Mock 附件存储服务
vi.mock('../services/attachmentStorage.js', () => ({
  getAttachment: vi.fn()
}));

import { getAttachment } from '../services/attachmentStorage.js';

describe('附件控制器', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    vi.clearAllMocks();
  });

  describe('downloadAttachmentHandler', () => {
    it('应该成功下载存在的附件', async () => {
      // 准备测试数据
      const attachmentId = 'test-attachment-id';
      const mockAttachment = {
        metadata: {
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024
        },
        content: Buffer.from('test content')
      };

      req.params.id = attachmentId;
      getAttachment.mockResolvedValue(mockAttachment);

      // 执行
      await downloadAttachmentHandler(req, res);

      // 验证
      expect(getAttachment).toHaveBeenCalledWith(attachmentId);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Length', 1024);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename*=UTF-8\'\'test.pdf');
      expect(res.send).toHaveBeenCalledWith(mockAttachment.content);
    });

    it('应该在附件ID缺失时返回400错误', async () => {
      // 不设置 req.params.id

      // 执行
      await downloadAttachmentHandler(req, res);

      // 验证
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Attachment ID is required'
      });
      expect(getAttachment).not.toHaveBeenCalled();
    });

    it('应该在附件不存在时返回404错误', async () => {
      // 准备测试数据
      req.params.id = 'non-existent-id';
      getAttachment.mockResolvedValue(null);

      // 执行
      await downloadAttachmentHandler(req, res);

      // 验证
      expect(getAttachment).toHaveBeenCalledWith('non-existent-id');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Attachment not found or expired'
      });
    });

    it('应该在附件已过期时返回404错误', async () => {
      // 准备测试数据
      req.params.id = 'expired-id';
      getAttachment.mockResolvedValue(null); // 过期附件返回null

      // 执行
      await downloadAttachmentHandler(req, res);

      // 验证
      expect(getAttachment).toHaveBeenCalledWith('expired-id');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Attachment not found or expired'
      });
    });

    it('应该在服务器错误时返回500错误', async () => {
      // 准备测试数据
      req.params.id = 'test-id';
      getAttachment.mockRejectedValue(new Error('Database error'));

      // Mock console.error 以避免测试输出
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // 执行
      await downloadAttachmentHandler(req, res);

      // 验证
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error while downloading attachment'
      });
      expect(consoleSpy).toHaveBeenCalled();

      // 清理
      consoleSpy.mockRestore();
    });

    it('应该正确处理包含特殊字符的文件名', async () => {
      // 准备测试数据
      const attachmentId = 'test-attachment-id';
      const mockAttachment = {
        metadata: {
          filename: '测试文件 (1).pdf',
          mimeType: 'application/pdf',
          size: 2048
        },
        content: Buffer.from('test content with special chars')
      };

      req.params.id = attachmentId;
      getAttachment.mockResolvedValue(mockAttachment);

      // 执行
      await downloadAttachmentHandler(req, res);

      // 验证
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename*=UTF-8\'\'%E6%B5%8B%E8%AF%95%E6%96%87%E4%BB%B6%20(1).pdf');
      expect(res.send).toHaveBeenCalledWith(mockAttachment.content);
    });

    it('应该正确处理不同的MIME类型', async () => {
      // 准备测试数据
      const testCases = [
        { mimeType: 'image/jpeg', filename: 'photo.jpg' },
        { mimeType: 'text/plain', filename: 'readme.txt' },
        { mimeType: 'application/zip', filename: 'archive.zip' }
      ];

      for (const testCase of testCases) {
        const mockAttachment = {
          metadata: {
            filename: testCase.filename,
            mimeType: testCase.mimeType,
            size: 1024
          },
          content: Buffer.from('test content')
        };

        req.params.id = 'test-id';
        getAttachment.mockResolvedValue(mockAttachment);

        // 执行
        await downloadAttachmentHandler(req, res);

        // 验证
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', testCase.mimeType);
      }
    });
  });
});