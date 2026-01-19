# 认证中间件

## 概述

`auth.js` 提供了 Token 验证中间件，用于保护 API 端点。

## 功能

- 验证请求头中的 Bearer Token
- 与配置的 `API_TOKEN` 环境变量进行比对
- Token 无效或缺失时返回 401 错误

## 使用方法

### 导入中间件

```javascript
import authMiddleware from "./middleware/auth.js";
```

### 应用到所有路由

```javascript
app.use(authMiddleware);
```

### 应用到特定路由

```javascript
app.post("/parse", authMiddleware, parseController);
app.get("/attachments/:id", authMiddleware, attachmentController);
```

## 请求格式

客户端需要在请求头中包含有效的 Bearer Token：

```
Authorization: Bearer <your-token>
```

## 响应格式

### 成功（Token 有效）

中间件调用 `next()`，请求继续处理。

### 失败（Token 无效或缺失）

返回 401 状态码和以下 JSON：

```json
{
  "error": "Unauthorized: Invalid or missing token"
}
```

## 测试

运行单元测试：

```bash
npm test src/middleware/auth.test.js
```

运行集成测试：

```bash
npm test src/middleware/auth.integration.test.js
```

## 配置

Token 通过环境变量 `API_TOKEN` 配置。详见 `src/config.js`。
