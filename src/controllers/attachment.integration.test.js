/**
 * 附件控制器集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import app from '../index.js';
import config from '../config.js';
import { saveAttachment, cleanupAttachment } from '../services/attachmentStorage.js';

describe('附件下载集成测试', () => {
  const testToken = config.apiToken;
  let testAttachmentId;

  beforeEach(async () => {
    // 确保测试附件目录存在
    try {
      await fs.access(config.attachmentDir);
    } catch {
      await fs.mkdir(config.attachmentDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // 清理测试附件
    if (testAttachmentId) {
      await cleanupAttachment(testAttachmentId);
      testAttachmentId = null;
    }
  });

  describe('GET /attachments/:id', () => {
    it('应该成功下载存在的附件', async () => {
      // 准备测试附件
      const testContent = Buffer.from('这是测试附件内容');
      const testFilename = 'test-document.txt';
      const testMimeType = 'text/plain';

      const result = await saveAttachment(testContent, testFilename, testMimeType);
      testAttachmentId = result.id;

      // 执行下载请求
      const response = await request(app)
        .get(`/attachments/${testAttachmentId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      // 验证响应头
      expect(response.headers['content-type']).toBe(testMimeType);
      expect(response.headers['content-length']).toBe(testContent.length.toString());
      expect(response.headers['content-disposition']).toContain('attachment');

      // 验证响应内容
      expect(response.text).toBe(testContent.toString());
    });

    it('应该在没有认证token时返回401', async () => {
      const response = await request(app)
        .get('/attachments/test-id')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Unauthorized: Invalid or missing token'
      });
    });

    it('应该在token无效时返回401', async () => {
      const response = await request(app)
        .get('/attachments/test-id')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Unauthorized: Invalid or missing token'
      });
    });

    it('应该在附件不存在时返回404', async () => {
      const response = await request(app)
        .get('/attachments/non-existent-id')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Attachment not found or expired'
      });
    });

    it('应该在附件ID为空时返回404', async () => {
      const response = await request(app)
        .get('/attachments/')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404); // Express 路由不匹配，返回404
    });

    it('应该正确处理二进制附件', async () => {
      // 创建测试二进制内容
      const testContent = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG 文件头
      const testFilename = 'test-image.png';
      const testMimeType = 'image/png';

      const result = await saveAttachment(testContent, testFilename, testMimeType);
      testAttachmentId = result.id;

      // 执行下载请求
      const response = await request(app)
        .get(`/attachments/${testAttachmentId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      // 验证响应头
      expect(response.headers['content-type']).toBe(testMimeType);
      expect(response.headers['content-disposition']).toContain('attachment');

      // 验证二进制内容长度
      expect(response.body.length).toBe(testContent.length);
    });

    it('应该正确处理大文件', async () => {
      // 创建较大的测试文件（1KB，避免测试太慢）
      const testContent = Buffer.alloc(1024, 'A');
      const testFilename = 'large-file.txt';
      const testMimeType = 'text/plain';

      const result = await saveAttachment(testContent, testFilename, testMimeType);
      testAttachmentId = result.id;

      // 执行下载请求
      const response = await request(app)
        .get(`/attachments/${testAttachmentId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      // 验证响应头
      expect(response.headers['content-type']).toBe(testMimeType);
      expect(response.headers['content-length']).toBe(testContent.length.toString());

      // 验证内容大小
      expect(response.text.length).toBe(testContent.length);
    });

    it('应该正确处理包含特殊字符的文件名', async () => {
      const testContent = Buffer.from('测试内容');
      const testFilename = '中文文件名.txt';
      const testMimeType = 'text/plain';

      const result = await saveAttachment(testContent, testFilename, testMimeType);
      testAttachmentId = result.id;

      // 执行下载请求
      const response = await request(app)
        .get(`/attachments/${testAttachmentId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      // 验证文件名在响应头中正确设置（使用RFC 5987编码）
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('filename*=UTF-8');
      expect(response.text).toBe(testContent.toString());
    });
  });
});