/**
 * 邮件解析控制器单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseEmailHandler } from './parse.js';

// Mock 依赖
vi.mock('../services/emailParser.js', () => ({
  parseEmail: vi.fn(),
  validateEmailData: vi.fn()
}));

vi.mock('../services/attachmentStorage.js', () => ({
  isAttachmentSizeExceeded: vi.fn(),
  getSkipReason: vi.fn(),
  saveAttachment: vi.fn()
}));

import { parseEmail, validateEmailData } from '../services/emailParser.js';
import { 
  isAttachmentSizeExceeded, 
  getSkipReason, 
  saveAttachment 
} from '../services/attachmentStorage.js';

describe('邮件解析控制器', () => {
  let req, res;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();
    
    // 创建 mock 请求和响应对象
    req = {
      body: Buffer.from('test email data')
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  describe('请求体验证', () => {
    it('应该拒绝空请求体', async () => {
      req.body = null;
      
      await parseEmailHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: '请求体不能为空'
      });
    });

    it('应该拒绝空缓冲区', async () => {
      req.body = Buffer.alloc(0);
      
      await parseEmailHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: '请求体不能为空'
      });
    });

    it('应该拒绝无效的邮件格式', async () => {
      validateEmailData.mockReturnValue(false);
      
      await parseEmailHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: '无效的邮件格式'
      });
    });
  });

  describe('邮件解析', () => {
    beforeEach(() => {
      validateEmailData.mockReturnValue(true);
    });

    it('应该处理邮件解析错误', async () => {
      parseEmail.mockRejectedValue(new Error('解析失败'));
      
      await parseEmailHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: '邮件解析失败: 解析失败'
      });
    });

    it('应该成功解析邮件并返回结果', async () => {
      const mockParsedEmail = {
        from: { name: '张三', address: 'zhangsan@example.com' },
        to: [{ name: '李四', address: 'lisi@example.com' }],
        cc: [],
        bcc: [],
        subject: '测试邮件',
        date: '2024-01-15T10:30:00.000Z',
        messageId: '<test@example.com>',
        text: '纯文本内容',
        html: '<p>HTML内容</p>',
        attachments: []
      };
      
      parseEmail.mockResolvedValue(mockParsedEmail);
      
      await parseEmailHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...mockParsedEmail,
        attachments: []
      });
    });
  });

  describe('附件处理', () => {
    beforeEach(() => {
      validateEmailData.mockReturnValue(true);
    });

    it('应该处理正常大小的附件', async () => {
      const mockAttachment = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('pdf content'),
        disposition: 'attachment'
      };
      
      const mockParsedEmail = {
        from: { name: '张三', address: 'zhangsan@example.com' },
        to: [],
        cc: [],
        bcc: [],
        subject: '测试',
        date: '2024-01-15T10:30:00.000Z',
        messageId: '<test@example.com>',
        text: '内容',
        html: '<p>内容</p>',
        attachments: [mockAttachment]
      };
      
      parseEmail.mockResolvedValue(mockParsedEmail);
      isAttachmentSizeExceeded.mockReturnValue(false);
      saveAttachment.mockResolvedValue({
        id: 'test-id',
        downloadUrl: '/attachments/test-id'
      });
      
      await parseEmailHandler(req, res);
      
      expect(saveAttachment).toHaveBeenCalledWith(
        mockAttachment.content,
        'test.pdf',
        'application/pdf'
      );
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [{
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            size: mockAttachment.content.length,
            disposition: 'attachment',
            id: 'test-id',
            downloadUrl: '/attachments/test-id'
          }]
        })
      );
    });

    it('应该标记超限附件为跳过', async () => {
      const mockAttachment = {
        filename: 'large.mp4',
        mimeType: 'video/mp4',
        content: Buffer.alloc(50 * 1024 * 1024), // 50MB
        disposition: 'attachment'
      };
      
      const mockParsedEmail = {
        from: { name: '张三', address: 'zhangsan@example.com' },
        to: [],
        cc: [],
        bcc: [],
        subject: '测试',
        date: '2024-01-15T10:30:00.000Z',
        messageId: '<test@example.com>',
        text: '内容',
        html: '<p>内容</p>',
        attachments: [mockAttachment]
      };
      
      parseEmail.mockResolvedValue(mockParsedEmail);
      isAttachmentSizeExceeded.mockReturnValue(true);
      getSkipReason.mockReturnValue('Attachment size exceeds limit (50.0MB > 10.0MB)');
      
      await parseEmailHandler(req, res);
      
      expect(saveAttachment).not.toHaveBeenCalled();
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [{
            filename: 'large.mp4',
            mimeType: 'video/mp4',
            size: mockAttachment.content.length,
            disposition: 'attachment',
            skipped: true,
            skipReason: 'Attachment size exceeds limit (50.0MB > 10.0MB)'
          }]
        })
      );
    });

    it('应该处理附件保存失败', async () => {
      const mockAttachment = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('pdf content'),
        disposition: 'attachment'
      };
      
      const mockParsedEmail = {
        from: { name: '张三', address: 'zhangsan@example.com' },
        to: [],
        cc: [],
        bcc: [],
        subject: '测试',
        date: '2024-01-15T10:30:00.000Z',
        messageId: '<test@example.com>',
        text: '内容',
        html: '<p>内容</p>',
        attachments: [mockAttachment]
      };
      
      parseEmail.mockResolvedValue(mockParsedEmail);
      isAttachmentSizeExceeded.mockReturnValue(false);
      saveAttachment.mockRejectedValue(new Error('磁盘空间不足'));
      
      await parseEmailHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [{
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            size: mockAttachment.content.length,
            disposition: 'attachment',
            skipped: true,
            skipReason: '附件保存失败: 磁盘空间不足'
          }]
        })
      );
    });

    it('应该处理缺少文件名的附件', async () => {
      const mockAttachment = {
        mimeType: 'application/pdf',
        content: Buffer.from('pdf content'),
        disposition: 'attachment'
      };
      
      const mockParsedEmail = {
        from: { name: '张三', address: 'zhangsan@example.com' },
        to: [],
        cc: [],
        bcc: [],
        subject: '测试',
        date: '2024-01-15T10:30:00.000Z',
        messageId: '<test@example.com>',
        text: '内容',
        html: '<p>内容</p>',
        attachments: [mockAttachment]
      };
      
      parseEmail.mockResolvedValue(mockParsedEmail);
      isAttachmentSizeExceeded.mockReturnValue(false);
      saveAttachment.mockResolvedValue({
        id: 'test-id',
        downloadUrl: '/attachments/test-id'
      });
      
      await parseEmailHandler(req, res);
      
      expect(saveAttachment).toHaveBeenCalledWith(
        mockAttachment.content,
        'unnamed',
        'application/pdf'
      );
    });
  });

  describe('错误处理', () => {
    it('应该处理服务器内部错误', async () => {
      validateEmailData.mockReturnValue(true);
      // 模拟在 try-catch 外部抛出的错误
      parseEmail.mockImplementation(() => {
        // 模拟一个在 processAttachments 中发生的错误
        throw new Error('意外错误');
      });
      
      await parseEmailHandler(req, res);
      
      // parseEmail 的错误会被内层 try-catch 捕获，返回 400
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: '邮件解析失败: 意外错误'
      });
    });

    it('应该处理真正的服务器内部错误', async () => {
      // 模拟在验证阶段就抛出的错误
      validateEmailData.mockImplementation(() => {
        throw new Error('验证过程中的意外错误');
      });
      
      await parseEmailHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: '服务器内部错误'
      });
    });
  });
});