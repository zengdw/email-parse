# 邮件解析HTTP服务

一个基于 Express.js 的 HTTP 服务，用于解析邮件的原始 ArrayBuffer 数据，返回结构化的邮件信息。支持附件处理、Token 验证和自动清理功能。

## 功能特性

- 📧 **邮件解析**: 使用 postal-mime 库解析邮件内容
- 📎 **附件处理**: 支持附件存储和安全下载，自动处理大小限制
- 🔐 **安全下载**: 两步验证下载流程，临时token机制防止直接访问
- 🔑 **Token 验证**: 所有接口需要 Bearer Token 认证
- 🧹 **自动清理**: 定期清理过期附件文件和临时token
- ⚡ **高性能**: 支持大文件处理和并发请求
- 🛡️ **错误处理**: 统一的错误响应格式

## 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm
- 支持 Windows、macOS、Linux

### 安装依赖

```bash
pnpm install
# 或
npm install
```

### 环境变量配置

创建 `.env` 文件并设置以下环境变量：

```bash
# 必填配置
API_TOKEN=your-secret-token-here

# 可选配置（有默认值）
PORT=3000
DOMAIN=http://localhost:3000
ATTACHMENT_TTL=3600000
TEMP_TOKEN_TTL=300000
MAX_ATTACHMENT_SIZE=10485760
REQUEST_BODY_LIMIT=100mb
ATTACHMENT_DIR=./attachments
```

### 启动服务

```bash
# 开发模式（自动重启）
pnpm dev

# 生产模式
pnpm start

# 运行测试
pnpm test
```

## 环境变量说明

| 变量名              | 说明                      | 默认值                | 必填 |
| ------------------- | ------------------------- | --------------------- | ---- |
| PORT                | 服务监听端口              | 3000                  | 否   |
| DOMAIN              | 服务域名                  | http://localhost:3000 | 否   |
| API_TOKEN           | 接口验证 Token            | 无                    | 是   |
| ATTACHMENT_TTL      | 附件过期时间（毫秒）      | 3600000 (1小时)       | 否   |
| TEMP_TOKEN_TTL      | 临时token过期时间（毫秒） | 300000 (5分钟)        | 否   |
| MAX_ATTACHMENT_SIZE | 单个附件大小限制（字节）  | 10485760 (10MB)       | 否   |
| REQUEST_BODY_LIMIT  | 请求体大小限制            | 100mb                 | 否   |
| ATTACHMENT_DIR      | 附件存储目录              | ./attachments         | 否   |

## API 接口

### 健康检查

```http
GET /health
```

**响应:**

```json
{
  "status": "ok"
}
```

### 邮件解析

```http
POST /parse
Authorization: Bearer <your-token>
Content-Type: application/octet-stream

<邮件原始二进制数据>
```

**成功响应 (200):**

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
      "downloadUrl": "http://localhost:3000/attachments/abc123"
    }
  ]
}
```

**错误响应:**

```json
{
  "error": "错误描述信息"
}
```

### 附件下载（两步流程）

#### 步骤1: 获取临时下载链接

```http
GET /attachments/:id
Authorization: Bearer <your-token>
```

**成功响应 (200):**

```json
{
  "downloadUrl": "http://localhost:3000/attachments/download/temp-token-uuid",
  "filename": "document.pdf",
  "size": 1024000,
  "mimeType": "application/pdf",
  "expiresIn": "5 minutes"
}
```

#### 步骤2: 使用临时链接下载文件

```http
GET /attachments/download/:token
```

**成功响应 (200):**

- 返回原始文件内容
- 设置正确的 Content-Type 和 Content-Disposition 头
- 无需认证，但token有时效性（默认5分钟）

## 使用示例

### Node.js 客户端示例

```javascript
import fs from "fs";
import fetch from "node-fetch";

const API_TOKEN = "your-secret-token";
const BASE_URL = "http://localhost:3000";

// 解析邮件
async function parseEmail(emailFilePath) {
  const emailData = fs.readFileSync(emailFilePath);

  const response = await fetch(`${BASE_URL}/parse`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/octet-stream",
    },
    body: emailData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}

// 下载附件
async function downloadAttachment(attachmentId, outputPath) {
  const response = await fetch(`${BASE_URL}/attachments/${attachmentId}`, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
}

// 使用示例
async function main() {
  try {
    // 解析邮件
    const result = await parseEmail("./sample-email.eml");
    console.log("邮件解析结果:", result);

    // 下载第一个附件
    if (result.attachments.length > 0) {
      const attachment = result.attachments[0];
      await downloadAttachment(attachment.id, `./${attachment.filename}`);
      console.log(`附件已下载: ${attachment.filename}`);
    }
  } catch (error) {
    console.error("错误:", error.message);
  }
}

main();
```

### cURL 示例

```bash
# 解析邮件
curl -X POST http://localhost:3000/parse \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @sample-email.eml

# 下载附件
curl -X GET http://localhost:3000/attachments/abc123 \
  -H "Authorization: Bearer your-secret-token" \
  -o downloaded-file.pdf
```

### Python 客户端示例

```python
import requests

API_TOKEN = 'your-secret-token'
BASE_URL = 'http://localhost:3000'

def parse_email(email_file_path):
    with open(email_file_path, 'rb') as f:
        email_data = f.read()

    response = requests.post(
        f'{BASE_URL}/parse',
        headers={
            'Authorization': f'Bearer {API_TOKEN}',
            'Content-Type': 'application/octet-stream'
        },
        data=email_data
    )

    if response.status_code != 200:
        raise Exception(response.json()['error'])

    return response.json()

def download_attachment(attachment_id, output_path):
    response = requests.get(
        f'{BASE_URL}/attachments/{attachment_id}',
        headers={'Authorization': f'Bearer {API_TOKEN}'}
    )

    if response.status_code != 200:
        raise Exception(response.json()['error'])

    with open(output_path, 'wb') as f:
        f.write(response.content)

# 使用示例
try:
    result = parse_email('./sample-email.eml')
    print('邮件解析结果:', result)

    if result['attachments']:
        attachment = result['attachments'][0]
        download_attachment(attachment['id'], attachment['filename'])
        print(f'附件已下载: {attachment["filename"]}')

except Exception as e:
    print(f'错误: {e}')
```

## 错误处理

所有错误响应都遵循统一格式：

```json
{
  "error": "错误描述信息"
}
```

常见错误码：

- `400`: 请求参数错误或邮件格式无效
- `401`: Token 验证失败
- `404`: 资源不存在（如附件已过期）
- `500`: 服务器内部错误

## 附件处理说明

### 大小限制

- 超过 `MAX_ATTACHMENT_SIZE` 限制的附件不会被存储
- 超限附件在响应中标记 `skipped: true` 并包含 `skipReason`

### 过期清理

- 附件在 `ATTACHMENT_TTL` 时间后自动过期
- 服务每 10 分钟自动清理过期附件
- 访问过期附件返回 404 错误

### 文件名处理

- 支持中文和特殊字符文件名
- 下载时使用 RFC 5987 标准编码

## 开发指南

### 项目结构

```
src/
├── index.js              # 应用入口
├── config.js             # 配置管理
├── middleware/
│   ├── auth.js           # Token 验证中间件
│   └── errorHandler.js   # 错误处理中间件
├── controllers/
│   ├── parse.js          # 邮件解析控制器
│   └── attachment.js     # 附件下载控制器
├── services/
│   ├── emailParser.js    # 邮件解析服务
│   └── attachmentStorage.js  # 附件存储服务
└── utils/
    └── cleanup.js        # 过期文件清理工具
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test -- src/services/emailParser.test.js

# 监听模式
pnpm test:watch
```

### 代码规范

项目使用以下工具确保代码质量：

- **Vitest**: 单元测试和集成测试
- **fast-check**: 属性测试
- **supertest**: HTTP 接口测试

## CI/CD 自动化

项目配置了GitHub Actions自动构建和发布Docker镜像：

### 自动构建触发条件

- **推送到主分支**: `main` 或 `develop` 分支的推送会触发构建
- **标签发布**: 创建 `v*` 格式的标签会构建对应版本镜像
- **Pull Request**: PR会构建但不推送镜像

### 镜像标签策略

- `latest`: 主分支最新版本
- `v1.0.0`: 具体版本号
- `v1.0`: 主要版本号
- `v1`: 大版本号
- `main`: 主分支构建
- `develop`: 开发分支构建

### 发布新版本

```bash
# 创建并推送标签
git tag v1.0.3
git push origin v1.0.3

# GitHub Actions会自动构建并推送镜像到:
# - ghcr.io/your-username/email-parse:v1.0.3
# - ghcr.io/your-username/email-parse:v1.0
# - ghcr.io/your-username/email-parse:v1
# - ghcr.io/your-username/email-parse:latest
```

## 部署指南

### Docker 部署

#### 使用预构建镜像

从GitHub Container Registry拉取最新镜像：

```bash
# 拉取最新镜像
docker pull ghcr.io/your-username/email-parse:latest

# 运行容器
docker run -d \
  --name email-parser \
  -p 3000:3000 \
  -e API_TOKEN=your-secret-token \
  -e DOMAIN=http://localhost:3000 \
  -e ATTACHMENT_TTL=3600000 \
  -e MAX_ATTACHMENT_SIZE=10485760 \
  ghcr.io/your-username/email-parse:latest
```

#### 本地构建

```bash
# 构建镜像
docker build -t email-parser .

# 运行容器
docker run -d \
  --name email-parser \
  -p 3000:3000 \
  -e API_TOKEN=your-secret-token \
  email-parser
```

#### 使用 Docker Compose

```bash
# 创建 .env 文件
echo "API_TOKEN=your-secret-token" > .env

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### Docker 环境变量

所有环境变量都可以通过 `-e` 参数或 docker-compose.yml 文件设置：

```bash
docker run -d \
  --name email-parser \
  -p 3000:3000 \
  -e API_TOKEN=your-secret-token \
  -e DOMAIN=https://your-domain.com \
  -e PORT=3000 \
  -e ATTACHMENT_TTL=7200000 \
  -e MAX_ATTACHMENT_SIZE=20971520 \
  -e REQUEST_BODY_LIMIT=100mb \
  -v $(pwd)/attachments:/app/attachments \
  email-parser
```

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start src/index.js --name email-parser

# 查看状态
pm2 status

# 查看日志
pm2 logs email-parser
```

## 性能优化

### 建议配置

- **生产环境**: 设置 `NODE_ENV=production`
- **内存限制**: 根据邮件大小调整 Node.js 内存限制
- **并发处理**: 使用 PM2 cluster 模式或负载均衡器
- **存储优化**: 定期清理附件目录，考虑使用对象存储

### 监控指标

- 请求响应时间
- 内存使用情况
- 附件存储空间
- 错误率统计

## 故障排除

### Windows 系统注意事项

本项目已完全兼容 Windows 系统：

- ✅ 所有脚本使用跨平台的 Node.js API
- ✅ 清理命令 `pnpm run clean` 在 Windows 上正常工作
- ✅ 快速启动脚本支持 PowerShell 和 CMD
- ✅ 路径处理自动适配 Windows 路径格式

### 常见问题

1. **Token 验证失败**
   - 检查 `API_TOKEN` 环境变量是否设置
   - 确认请求头格式：`Authorization: Bearer <token>`

2. **邮件解析失败**
   - 检查邮件文件格式是否正确
   - 确认 Content-Type 为 `application/octet-stream`

3. **附件下载失败**
   - 检查附件是否已过期（默认1小时）
   - 确认附件ID是否正确

4. **服务启动失败**
   - 检查端口是否被占用
   - 确认所有必需的环境变量已设置

### 日志查看

服务会输出详细的日志信息：

- 启动信息
- 请求处理日志
- 错误详情
- 清理操作记录

## 许可证

MIT License

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 更新日志

### v1.0.0

- 初始版本发布
- 支持邮件解析和附件处理
- 实现 Token 认证和自动清理功能
