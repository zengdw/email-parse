# 邮件解析HTTP服务 - 需求文档

## 功能概述

创建一个基于 Express.js 的 HTTP 服务，接收邮件的原始 ArrayBuffer 数据，使用 postal-mime 库解析邮件内容，返回结构化的邮件信息。附件存储在文件系统中，通过单独的下载接口获取，所有接口需要 Token 验证。

## 用户故事

### 1. 身份验证

**作为** API 调用者  
**我希望** 通过 Token 验证身份  
**以便** 安全地访问服务

#### 验收标准

- 1.1 所有接口需要在请求头中携带 `Authorization: Bearer <token>`
- 1.2 Token 通过环境变量 `API_TOKEN` 配置
- 1.3 Token 无效或缺失时返回 401 错误
- 1.4 错误响应包含明确的认证失败信息

### 2. 邮件解析

**作为** API 调用者  
**我希望** 发送邮件原始数据到服务端  
**以便** 获取解析后的邮件信息

#### 验收标准

- 2.1 服务提供 POST `/parse` 端点接收邮件数据
- 2.2 接受 `application/octet-stream` 类型的请求体（原始邮件 ArrayBuffer）
- 2.3 成功解析后返回 JSON 格式的邮件信息
- 2.4 解析失败时返回适当的错误信息和状态码
- 2.5 解析结果中的附件返回下载地址而非内容

### 3. 邮件信息提取

**作为** API 调用者  
**我希望** 获取完整的邮件元数据  
**以便** 了解邮件的基本信息

#### 验收标准

- 3.1 返回发件人信息（from）：包含 name（名称）和 address（邮箱地址）
- 3.2 返回收件人信息（to）：数组，每项包含 name（名称）和 address（邮箱地址）
- 3.3 返回抄送信息（cc）：数组，每项包含 name（名称）和 address（邮箱地址）
- 3.4 返回密送信息（bcc）：数组，每项包含 name（名称）和 address（邮箱地址）
- 3.5 返回邮件主题（subject）
- 3.6 返回邮件日期（date）
- 3.7 返回邮件 ID（messageId）

### 4. 邮件正文提取

**作为** API 调用者  
**我希望** 获取邮件的正文内容  
**以便** 阅读邮件内容

#### 验收标准

- 4.1 返回纯文本正文（text）
- 4.2 返回 HTML 正文（html）
- 4.3 正确处理多种字符编码

### 5. 附件处理

**作为** API 调用者  
**我希望** 获取邮件的附件信息和下载地址  
**以便** 按需下载附件

#### 验收标准

- 5.1 解析响应中返回附件列表，每个附件包含：
  - id：附件唯一标识
  - filename：文件名
  - mimeType：MIME 类型
  - size：文件大小（字节）
  - disposition：附件类型（attachment/inline）
  - downloadUrl：附件下载地址
- 5.2 提供 GET `/attachments/:id` 端点下载附件
- 5.3 附件下载接口返回原始文件内容，设置正确的 Content-Type 和 Content-Disposition
- 5.4 附件存储在文件系统中，1小时后自动清理过期文件
- 5.5 附件不存在或已过期时返回 404 错误

### 6. 附件大小限制

**作为** 系统管理员  
**我希望** 限制可解析的附件大小  
**以便** 保护服务器资源

#### 验收标准

- 6.1 附件大小限制通过环境变量 `MAX_ATTACHMENT_SIZE` 配置（单位：字节）
- 6.2 超过大小限制的附件不进行存储
- 6.3 超限附件在响应中标记 `skipped: true` 并包含 `skipReason` 说明原因
- 6.4 超限附件仍返回基本信息（filename、mimeType、size）但无 downloadUrl

### 7. 错误处理

**作为** API 调用者  
**我希望** 在请求失败时获得清晰的错误信息  
**以便** 排查问题

#### 验收标准

- 7.1 请求体为空时返回 400 错误
- 7.2 邮件格式无效时返回 400 错误并说明原因
- 7.3 服务器内部错误返回 500 错误
- 7.4 错误响应包含 error 字段说明错误原因

## 技术约束

- 使用 Express.js 作为 HTTP 框架
- 使用 postal-mime 库解析邮件
- 服务默认监听 3000 端口（可通过环境变量 `PORT` 配置）
- Token 通过环境变量 `API_TOKEN` 配置
- 附件存储在文件系统的临时目录中
- 支持 Node.js 18+

## 环境变量

| 变量名              | 说明                     | 默认值          |
| ------------------- | ------------------------ | --------------- |
| PORT                | 服务监听端口             | 3000            |
| API_TOKEN           | 接口验证 Token           | 无（必填）      |
| ATTACHMENT_TTL      | 附件过期时间（毫秒）     | 3600000 (1小时) |
| MAX_ATTACHMENT_SIZE | 单个附件大小限制（字节） | 10485760 (10MB) |
| ATTACHMENT_DIR      | 附件存储目录             | ./attachments   |

## API 响应格式

### 成功响应 - 邮件解析 (200)

```json
{
  "from": { "name": "张三", "address": "zhangsan@example.com" },
  "to": [{ "name": "李四", "address": "lisi@example.com" }],
  "cc": [{ "name": "王五", "address": "wangwu@example.com" }],
  "bcc": [],
  "subject": "邮件主题",
  "date": "2024-01-15T10:30:00.000Z",
  "messageId": "<message-id@example.com>",
  "text": "纯文本正文",
  "html": "<html>HTML正文</html>",
  "attachments": [
    {
      "id": "abc123",
      "filename": "document.pdf",
      "mimeType": "application/pdf",
      "size": 12345,
      "disposition": "attachment",
      "downloadUrl": "/attachments/abc123"
    },
    {
      "id": "def456",
      "filename": "large-video.mp4",
      "mimeType": "video/mp4",
      "size": 52428800,
      "disposition": "attachment",
      "skipped": true,
      "skipReason": "Attachment size exceeds limit (50MB > 10MB)"
    }
  ]
}
```

### 认证失败响应 (401)

```json
{
  "error": "Unauthorized: Invalid or missing token"
}
```

### 错误响应 (4xx/5xx)

```json
{
  "error": "错误描述信息"
}
```
