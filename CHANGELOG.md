# 更新日志

## v1.0.3 (2026-01-20)

### ✨ 新功能

- **根路由欢迎页面**: 添加了 `/` 路由的 HTML 欢迎页面
  - 显示服务状态和端口信息
  - 列出所有可用的 API 端点
  - 展示功能特性介绍
  - 包含 GitHub 仓库链接
  - 响应式设计，紧凑美观的界面

### 🏗️ 技术改进

- **模板系统**: 创建了简单的 HTML 模板渲染系统
  - 新增 `src/templates/index.html` 模板文件
  - 新增 `src/utils/template.js` 模板渲染工具
  - 支持变量替换（如动态端口号显示）
- **代码组织**: 将 HTML 内容从 JavaScript 代码中分离，提高可维护性

### 📁 新增文件

- `src/templates/index.html` - HTML 欢迎页面模板
- `src/utils/template.js` - 模板渲染工具

## v1.0.2 (2026-01-19)

### 🐛 Bug 修复

- **Windows 兼容性**: 修复了 `pnpm run clean` 命令在 Windows 系统上的错误
- **跨平台清理**: 创建了跨平台的清理脚本 `scripts/clean.js`

### 🔧 技术改进

- 将 `rm -rf` 命令替换为 Node.js 原生的 `fs.rmSync()` API
- 添加了更友好的清理脚本，支持详细的清理日志
- 确保所有脚本在 Windows、macOS 和 Linux 上都能正常工作

### ✅ 验证

- Windows PowerShell 环境测试通过
- 清理脚本正常删除临时目录
- 快速启动脚本跨平台兼容

## v1.0.1 (2026-01-19)

### 🐛 Bug 修复

- **postal-mime 导入错误**: 修复了 `postal-mime` 库的导入方式，从命名导入改为默认导入
- **环境变量加载**: 添加了 `dotenv` 支持，自动加载 `.env` 文件中的环境变量
- **测试配置**: 统一了测试环境中的 API_TOKEN 配置，确保所有测试通过

### 🔧 技术改进

- 更新了 `src/services/emailParser.js` 中的导入语句：

  ```javascript
  // 之前（错误）
  import { parse } from "postal-mime";

  // 现在（正确）
  import PostalMime from "postal-mime";
  ```

- 在 `src/config.js` 中添加了 dotenv 配置：
  ```javascript
  import dotenv from "dotenv";
  dotenv.config();
  ```

### ✅ 测试状态

- 所有 117 个测试通过
- 包括单元测试、集成测试和属性测试
- 测试覆盖率完整

### 📦 依赖更新

- 添加 `dotenv@17.2.3` 用于环境变量管理

## v1.0.0 (2026-01-19)

### 🎉 初始版本发布

#### ✨ 核心功能

- **邮件解析**: 使用 postal-mime 库解析邮件内容
- **附件处理**: 支持附件存储、下载和大小限制
- **Token 认证**: 所有接口需要 Bearer Token 验证
- **自动清理**: 定期清理过期附件文件（默认1小时）
- **错误处理**: 统一的错误响应格式

#### 🏗️ 技术架构

- **框架**: Express.js 5.2.1
- **邮件解析**: postal-mime 2.7.3
- **ID生成**: uuid 13.0.0
- **测试框架**: Vitest 4.0.17
- **属性测试**: fast-check 4.5.3

#### 📁 项目结构

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

#### 🔌 API 接口

- `GET /health` - 健康检查
- `POST /parse` - 邮件解析
- `GET /attachments/:id` - 附件下载

#### 🧪 测试覆盖

- 117 个测试用例
- 单元测试、集成测试、属性测试
- 完整的错误处理测试
- 性能和边界条件测试

#### 📚 文档和示例

- 完整的 README.md 使用说明
- 客户端示例代码（Node.js、Python、cURL）
- 快速启动脚本
- 环境配置模板

#### 🔧 开发工具

- 自动化测试套件
- 代码质量检查
- 示例邮件和客户端
- Docker 部署支持
