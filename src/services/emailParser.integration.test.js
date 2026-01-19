import { describe, it, expect } from 'vitest';
import { parseEmail } from './emailParser.js';

describe('EmailParser Integration Tests', () => {
  it('应该解析包含中文的完整邮件', async () => {
    const emailContent = `From: 张三 <zhangsan@example.com>
To: 李四 <lisi@example.com>, 王五 <wangwu@example.com>
Cc: 赵六 <zhaoliu@example.com>
Subject: 测试邮件主题
Date: Mon, 15 Jan 2024 10:30:00 +0800
Message-ID: <test-message-123@example.com>
Content-Type: multipart/alternative; boundary="boundary123"

--boundary123
Content-Type: text/plain; charset=utf-8

这是纯文本内容。
包含中文字符。

--boundary123
Content-Type: text/html; charset=utf-8

<html>
<body>
<h1>这是HTML内容</h1>
<p>包含中文字符。</p>
</body>
</html>

--boundary123--`;

    const buffer = new TextEncoder().encode(emailContent).buffer;
    const result = await parseEmail(buffer);

    // 验证基本字段
    expect(result.from).toEqual({
      name: '张三',
      address: 'zhangsan@example.com'
    });

    expect(result.to).toHaveLength(2);
    expect(result.to[0]).toEqual({
      name: '李四',
      address: 'lisi@example.com'
    });
    expect(result.to[1]).toEqual({
      name: '王五',
      address: 'wangwu@example.com'
    });

    expect(result.cc).toHaveLength(1);
    expect(result.cc[0]).toEqual({
      name: '赵六',
      address: 'zhaoliu@example.com'
    });

    expect(result.bcc).toEqual([]);
    expect(result.subject).toBe('测试邮件主题');
    expect(result.messageId).toBe('<test-message-123@example.com>');
    expect(result.date).toBeTruthy();

    // 验证正文内容
    expect(result.text).toContain('这是纯文本内容');
    expect(result.html).toContain('<h1>这是HTML内容</h1>');
  });

  it('应该处理只有基本头部的简单邮件', async () => {
    const emailContent = `From: simple@example.com
To: recipient@example.com
Subject: Simple Email

This is a simple email body.`;

    const buffer = new TextEncoder().encode(emailContent).buffer;
    const result = await parseEmail(buffer);

    expect(result.from).toEqual({
      name: 'simple@example.com',
      address: 'simple@example.com'
    });

    expect(result.to).toEqual([{
      name: 'recipient@example.com',
      address: 'recipient@example.com'
    }]);

    expect(result.subject).toBe('Simple Email');
    expect(result.text).toContain('This is a simple email body');
  });

  it('应该处理包含附件信息的邮件', async () => {
    const emailContent = `From: sender@example.com
To: recipient@example.com
Subject: Email with Attachment
Content-Type: multipart/mixed; boundary="mixed123"

--mixed123
Content-Type: text/plain

Email body with attachment.

--mixed123
Content-Type: application/pdf; name="document.pdf"
Content-Disposition: attachment; filename="document.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQKJcOkw7zDtsO4CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo+PgpzdHJlYW0K

--mixed123--`;

    const buffer = new TextEncoder().encode(emailContent).buffer;
    const result = await parseEmail(buffer);

    expect(result.text).toContain('Email body with attachment');
    expect(result.attachments).toBeDefined();
    // postal-mime 会解析附件，具体格式取决于库的实现
  });
});