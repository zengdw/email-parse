/**
 * 全局错误处理中间件
 * 确保所有错误响应格式一致
 */

/**
 * 全局错误处理中间件
 * @param {Error} err - 错误对象
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - Express next 函数
 */
function errorHandler(err, req, res, next) {
  // 如果响应已经发送，交给默认的 Express 错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 记录错误日志
  console.error('全局错误处理器捕获错误:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 根据错误类型设置状态码
  let statusCode = 500;
  let errorMessage = '服务器内部错误';

  // 处理特定类型的错误
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorMessage = 'Unauthorized: Invalid or missing token';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorMessage = err.message;
  } else if (err.status) {
    // Express 错误对象可能包含 status 属性
    statusCode = err.status;
    errorMessage = err.message || errorMessage;
  }

  // 在开发环境中提供更详细的错误信息
  if (process.env.NODE_ENV === 'development') {
    errorMessage = err.message || errorMessage;
  }

  // 返回统一格式的错误响应
  res.status(statusCode).json({
    error: errorMessage
  });
}

/**
 * 404 错误处理中间件
 * 处理未匹配的路由
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`
  });
}

export { errorHandler, notFoundHandler };