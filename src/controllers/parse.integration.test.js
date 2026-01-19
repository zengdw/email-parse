/**
 * 邮件解析控制器集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import app from '../index.js';
import config from '../config.js';

describe('邮件解析控制器集成测试', () => {
  const testToken = config.apiToken || 'test-token';
  
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
    try {
      const files = await fs.readdir(config.attachmentDir);
      for (const file of files) {
        await fs.unlink(path.join(config.attachmentDir, file));
      }
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('POST /parse', () => {
    it('应该拒绝没有认证token的请求', async () => {
      const response = await request(app)
        .post('/parse')
        .send(Buffer.from('test email'));

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized: Invalid or missing token'
      });
    });

    it('应该拒绝无效token的请求', async () => {
      const response = await request(app)
        .post('/parse')
        .set('Authorization', 'Bearer invalid-token')
        .send(Buffer.from('test email'));

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized: Invalid or missing token'
      });
    });

    it('应该拒绝空请求体', async () => {
      const response = await request(app)
        .post('/parse')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/octet-stream');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: '请求体不能为空'
      });
    });

    it('应该拒绝无效的邮件格式', async () => {
      const response = await request(app)
        .post('/parse')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/octet-stream')
        .send(Buffer.from('invalid email data'));

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/无效的邮件格式|邮件解析失败/);
    });

    it('应该成功解析简单邮件', async () => {
      // 创建一个简单的邮件
      const simpleEmail = [
        'From: sender@example.com',
        'To: recipient@example.com',
        'Subject: Test Email',
        'Date: Mon, 15 Jan 2024 10:30:00 +0000',
        'Message-ID: <test@example.com>',
        'Content-Type: text/plain',
        '',
        'This is a test email.'
      ].join('\r\n');

      const response = await request(app)
        .post('/parse')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/octet-stream')
        .send(Buffer.from(simpleEmail));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        from: expect.objectContaining({
          address: 'sender@example.com'
        }),
        to: expect.arrayContaining([
          expect.objectContaining({
            address: 'recipient@example.com'
          })
        ]),
        subject: 'Test Email',
        text: expect.stringContaining('This is a test email'),
        attachments: []
      });
    });

    it('应该处理带有小附件的邮件', async () => {
      // 创建一个带有小附件的邮件
      const boundary = 'test-boundary-123';
      const emailWithAttachment = [
        'From: sender@example.com',
        'To: recipient@example.com',
        'Subject: Email with Attachment',
        'Date: Mon, 15 Jan 2024 10:30:00 +0000',
        'Message-ID: <test-attachment@example.com>',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain',
        '',
        'This email has an attachment.',
        '',
        `--${boundary}`,
        'Content-Type: text/plain',
        'Content-Disposition: attachment; filename="test.txt"',
        '',
        'This is the attachment content.',
        '',
        `--${boundary}--`
      ].join('\r\n');

      const response = await request(app)
        .post('/parse')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/octet-stream')
        .send(Buffer.from(emailWithAttachment));

      expect(response.status).toBe(200);
      expect(response.body.attachments).toHaveLength(1);
      
      const attachment = response.body.attachments[0];
      
      // 验证附件基本信息
      expect(attachment).toMatchObject({
        filename: 'test.txt',
        mimeType: 'text/plain',
        size: expect.any(Number),
        disposition: 'attachment'
      });
      
      // 检查附件是否成功保存
      if (attachment.skipped) {
        // 如果被跳过，应该有跳过原因
        expect(attachment.skipReason).toBeDefined();
      } else {
        // 如果没有被跳过，应该有 ID 和下载 URL
        expect(attachment.id).toBeDefined();
        expect(attachment.downloadUrl).toMatch(/^\/attachments\//);
      }
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok'
      });
    });
  });
});