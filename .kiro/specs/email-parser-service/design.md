# 邮件解析HTTP服务 - 设计文档

## 概述

本设计文档描述邮件解析HTTP服务的技术架构和实现方案。服务使用 Express.js 框架，通过 postal-mime 库解析邮件，提供 RESTful API 接口。

## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Express Server                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Auth        │  │ Parse       │  │ Attachment          │  │
│  │ Middleware  │──│ Controller  │──│ Controller          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │               │                    │               │
│         ▼               ▼                    ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Token       │  │ Email       │  │ Attachment          │  │
│  │ Validator   │  │ Parser      │  │ Storage             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                         │                    │               │
│                         ▼                    ▼               │
│                  ┌─────────────┐  ┌─────────────────────┐   │
│                  │ postal-mime │  │ File System         │   │
│                  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
src/
├── index.js              # 应用入口
├── config.js             # 配置管理
├── middleware/
│   └── auth.js           # Token 验证中间件
├── controllers/
│   ├── parse.js          # 邮件解析控制器
│   └── attachment.js     # 附件下载控制器
├── services/
│   ├── emailParser.js    # 邮件解析服务
│   └── attachmentStorage.js  # 附件存储服务
└── utils/
    └── cleanup.js        # 过期文件清理工具
```

## 模块设计

### 1. 配置模块 (config.js)

负责读取和验证环境变量配置。

```javascript
// 配置项
{
  port: process.env.PORT || 3000,
  apiToken: process.env.API_TOKEN,  // 必填
  attachmentTtl: process.env.ATTACHMENT_TTL || 3600000,
  maxAttachmentSize: process.env.MAX_ATTACHMENT_SIZE || 10485760,
  attachmentDir: process.env.ATTACHMENT_DIR || './attachments'
}
```

### 2. 认证中间件 (middleware/auth.js)

验证请求头中的 Bearer Token。

**输入**: Express Request 对象
**输出**: 调用 next() 或返回 401 错误

**逻辑**:

1. 从 `Authorization` 头提取 token
2. 与配置的 `API_TOKEN` 比较
3. 匹配则放行，否则返回 401

### 3. 邮件解析服务 (services/emailParser.js)

封装 postal-mime 库，提供邮件解析功能。

**输入**: ArrayBuffer (原始邮件数据)
**输出**: 解析后的邮件对象

**职责**:

- 调用 postal-mime 解析邮件
- 格式化地址信息（确保包含 name 和 address）
- 处理附件信息

### 4. 附件存储服务 (services/attachmentStorage.js)

管理附件的存储和检索。

**职责**:

- 生成唯一附件 ID
- 将附件保存到文件系统
- 记录附件元数据（用于下载时设置响应头）
- 检查附件大小限制
- 提供附件检索功能

**数据结构**:

```javascript
// 附件元数据（内存中维护）
{
  [attachmentId]: {
    filename: string,
    mimeType: string,
    size: number,
    filePath: string,
    createdAt: number  // 时间戳
  }
}
```

### 5. 解析控制器 (controllers/parse.js)

处理 POST /parse 请求。

**流程**:

1. 验证请求体不为空
2. 调用邮件解析服务
3. 遍历附件，检查大小限制
4. 符合限制的附件存储到文件系统
5. 构建响应对象返回

### 6. 附件控制器 (controllers/attachment.js)

处理 GET /attachments/:id 请求。

**流程**:

1. 根据 ID 查找附件元数据
2. 检查附件是否存在且未过期
3. 设置响应头（Content-Type, Content-Disposition）
4. 返回文件流

### 7. 清理工具 (utils/cleanup.js)

定期清理过期附件。

**实现**:

- 启动时创建定时器（每 10 分钟执行一次）
- 遍历附件元数据，删除过期项
- 同时删除对应的文件

## API 设计

### POST /parse

解析邮件原始数据。

**请求**:

- Headers: `Authorization: Bearer <token>`, `Content-Type: application/octet-stream`
- Body: 邮件原始二进制数据

**响应**: 见需求文档中的响应格式

### GET /attachments/:id

下载附件。

**请求**:

- Headers: `Authorization: Bearer <token>`
- Params: `id` - 附件唯一标识

**响应**:

- Headers: `Content-Type: <mimeType>`, `Content-Disposition: attachment; filename="<filename>"`
- Body: 附件二进制内容

## 正确性属性

以下属性用于验证系统行为的正确性：

### P1: 认证一致性

**属性**: 对于任意请求，当且仅当请求头包含有效的 Bearer Token 时，请求才能被处理
**验证**: 使用属性测试验证各种 token 组合（有效、无效、缺失、格式错误）

### P2: 邮件解析完整性

**属性**: 对于任意有效的邮件数据，解析结果必须包含所有必需字段（from、to、subject、text/html）
**验证**: 生成随机有效邮件数据，验证解析结果结构

### P3: 地址格式一致性

**属性**: 所有地址字段（from、to、cc、bcc）中的每个地址对象必须包含 name 和 address 属性
**验证**: 解析包含各种地址格式的邮件，验证输出格式

### P4: 附件存储一致性

**属性**: 对于任意未超限的附件，存储后通过下载接口获取的内容必须与原始内容完全一致
**验证**: 存储随机附件数据，下载后比较字节一致性

### P5: 附件大小限制

**属性**: 对于任意超过大小限制的附件，响应中必须标记 skipped: true 且不包含 downloadUrl
**验证**: 生成各种大小的附件，验证限制行为

### P6: 错误响应格式

**属性**: 对于任意错误响应，响应体必须包含 error 字段且为字符串类型
**验证**: 触发各种错误场景，验证响应格式

## 测试策略

### 单元测试

- 配置模块：验证默认值和环境变量读取
- 认证中间件：验证 token 验证逻辑
- 邮件解析服务：验证解析结果格式
- 附件存储服务：验证存储和检索逻辑

### 集成测试

- 完整的邮件解析流程
- 附件上传和下载流程
- 错误处理流程

### 属性测试框架

使用 fast-check 进行属性测试，验证上述正确性属性。

## 依赖

### 生产依赖

- express: HTTP 框架
- postal-mime: 邮件解析
- uuid: 生成附件 ID

### 开发依赖

- vitest: 测试框架
- fast-check: 属性测试
- supertest: HTTP 测试

## 安全考虑

1. **Token 验证**: 所有接口强制验证 Token
2. **路径遍历防护**: 附件 ID 使用 UUID，避免路径注入
3. **大小限制**: 防止大文件耗尽服务器资源
4. **自动清理**: 防止磁盘空间耗尽
