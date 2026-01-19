# 邮件解析HTTP服务 - 使用指南

## 🚀 快速开始

### 1. 一键启动（推荐）

```bash
node scripts/quick-start.js
```

这个脚本会自动：

- 创建 `.env` 配置文件
- 生成随机 API Token
- 安装依赖包
- 启动服务

### 2. 手动启动

```bash
# 1. 复制配置文件
cp .env.example .env

# 2. 编辑 .env 文件，设置 API_TOKEN
nano .env

# 3. 安装依赖
pnpm install

# 4. 启动服务
pnpm start
```

## 📋 基本使用

### 1. 检查服务状态

```bash
curl http://localhost:3000/health
```

### 2. 解析邮件

```bash
curl -X POST http://localhost:3000/parse \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @examples/sample-email.eml
```

### 3. 下载附件

```bash
curl -X GET http://localhost:3000/attachments/attachment-id \
  -H "Authorization: Bearer your-api-token" \
  -o downloaded-file.txt
```

## 🧪 运行示例

```bash
# 设置 API Token（如果使用自定义token）
export API_TOKEN=your-api-token

# 运行客户端示例
pnpm example
```

## 🔧 配置说明

### 必填配置

- `API_TOKEN`: API访问令牌

### 可选配置

- `PORT`: 服务端口（默认3000）
- `ATTACHMENT_TTL`: 附件过期时间（默认1小时）
- `MAX_ATTACHMENT_SIZE`: 附件大小限制（默认10MB）
- `ATTACHMENT_DIR`: 附件存储目录（默认./attachments）

## 📝 API 接口

### GET /health

健康检查，无需认证

### POST /parse

解析邮件，需要 Bearer Token 认证

- Content-Type: application/octet-stream
- Body: 邮件原始二进制数据

### GET /attachments/:id

下载附件，需要 Bearer Token 认证

## 🛠️ 开发命令

```bash
# 开发模式（自动重启）
pnpm dev

# 运行测试
pnpm test

# 监听测试
pnpm test:watch

# 生成测试覆盖率报告
pnpm test:coverage

# 清理临时文件
pnpm clean
```

## 📊 监控和日志

服务会输出详细日志：

- 启动信息
- 请求处理
- 错误详情
- 清理操作

## 🔒 安全注意事项

1. **保护 API Token**: 不要在代码中硬编码token
2. **HTTPS**: 生产环境建议使用HTTPS
3. **防火墙**: 限制服务访问来源
4. **定期更新**: 保持依赖包最新版本

## 🚨 故障排除

### 服务无法启动

- 检查端口是否被占用
- 确认 API_TOKEN 已设置
- 查看错误日志

### 邮件解析失败

- 检查邮件文件格式
- 确认 Content-Type 正确
- 验证 Token 是否有效

### 附件下载失败

- 检查附件是否过期
- 确认附件ID正确
- 验证存储目录权限

## 📞 获取帮助

如果遇到问题：

1. 查看日志输出
2. 检查配置文件
3. 运行测试确认功能正常
4. 查阅完整文档 README.md
