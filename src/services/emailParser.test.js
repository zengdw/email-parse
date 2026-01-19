import { describe, it, expect } from 'vitest';
import { parseEmail, validateEmailData, formatAddresses, formatSingleAddress } from './emailParser.js';

describe('EmailParser Service', () => {
  describe('formatAddresses', () => {
    it('应该格式化字符串地址为包含name和address的对象', () => {
      const result = formatAddresses('test@example.com');
      expect(result).toEqual([{
        name: 'test@example.com',
        address: 'test@example.com'
      }]);
    });

    it('应该解析带名称的地址格式', () => {
      const result = formatAddresses('张三 <zhangsan@example.com>');
      expect(result).toEqual([{
        name: '张三',
        address: 'zhangsan@example.com'
      }]);
    });

    it('应该处理地址数组', () => {
      const addresses = [
        'test1@example.com',
        '李四 <lisi@example.com>'
      ];
      const result = formatAddresses(addresses);
      expect(result).toEqual([
        { name: 'test1@example.com', address: 'test1@example.com' },
        { name: '李四', address: 'lisi@example.com' }
      ]);
    });

    it('应该处理已经是对象格式的地址', () => {
      const addresses = [
        { name: '王五', address: 'wangwu@example.com' },
        { address: 'test@example.com' }
      ];
      const result = formatAddresses(addresses);
      expect(result).toEqual([
        { name: '王五', address: 'wangwu@example.com' },
        { name: 'test@example.com', address: 'test@example.com' }
      ]);
    });

    it('应该处理空值或undefined', () => {
      expect(formatAddresses(null)).toEqual([]);
      expect(formatAddresses(undefined)).toEqual([]);
      expect(formatAddresses([])).toEqual([]);
    });
  });

  describe('formatSingleAddress', () => {
    it('应该格式化单个地址', () => {
      const result = formatSingleAddress('张三 <zhangsan@example.com>');
      expect(result).toEqual({
        name: '张三',
        address: 'zhangsan@example.com'
      });
    });

    it('应该处理空值', () => {
      const result = formatSingleAddress(null);
      expect(result).toEqual({
        name: '',
        address: ''
      });
    });
  });

  describe('validateEmailData', () => {
    it('应该验证有效的邮件数据', () => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Email
Date: Mon, 15 Jan 2024 10:30:00 +0000

This is a test email.`;
      
      const buffer = new TextEncoder().encode(emailContent).buffer;
      expect(validateEmailData(buffer)).toBe(true);
    });

    it('应该拒绝空数据', () => {
      expect(validateEmailData(null)).toBe(false);
      expect(validateEmailData(undefined)).toBe(false);
      expect(validateEmailData(new ArrayBuffer(0))).toBe(false);
    });

    it('应该拒绝无效的邮件数据', () => {
      const invalidContent = 'This is not an email';
      const buffer = new TextEncoder().encode(invalidContent).buffer;
      expect(validateEmailData(buffer)).toBe(false);
    });
  });

  describe('parseEmail', () => {
    it('应该解析基本的邮件内容', async () => {
      const emailContent = `From: sender@example.com
To: recipient@example.com
Subject: Test Email
Date: Mon, 15 Jan 2024 10:30:00 +0000
Message-ID: <test@example.com>

This is a test email.`;
      
      const buffer = new TextEncoder().encode(emailContent).buffer;
      const result = await parseEmail(buffer);
      
      expect(result).toMatchObject({
        from: expect.objectContaining({
          name: expect.any(String),
          address: expect.any(String)
        }),
        to: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            address: expect.any(String)
          })
        ]),
        cc: expect.any(Array),
        bcc: expect.any(Array),
        subject: expect.any(String),
        date: expect.any(String),
        messageId: expect.any(String),
        text: expect.any(String),
        html: expect.any(String),
        attachments: expect.any(Array)
      });
    });

    it('应该处理解析错误', async () => {
      // 测试完全无效的数据
      const invalidBuffer = new TextEncoder().encode('完全无效的数据').buffer;
      const result = await parseEmail(invalidBuffer);
      
      // postal-mime 对于无效数据会返回空结果，这是正常行为
      expect(result).toMatchObject({
        from: { name: '', address: '' },
        to: [],
        cc: [],
        bcc: [],
        subject: '',
        text: '',
        html: '',
        attachments: []
      });
    });
  });
});