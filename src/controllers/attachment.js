/**
 * 附件下载控制器
 * 处理附件相关的请求
 */

import { getAttachment, getAttachmentMetadata, generateTempToken, validateTempToken } from '../services/attachmentStorage.js';
import config from '../config.js';

/**
 * 获取附件下载链接处理器
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 */
async function getAttachmentDownloadLinkHandler(req, res) {
  try {
    const { id } = req.params;
    
    // 验证附件ID参数
    if (!id) {
      return res.status(400).json({
        error: 'Attachment ID is required'
      });
    }
    
    // 检查附件是否存在（不获取内容，只检查元数据）
    const metadata = getAttachmentMetadata(id);
    
    if (!metadata) {
      return res.status(404).json({
        error: 'Attachment not found or expired'
      });
    }
    
    // 生成临时下载token
    const tempToken = generateTempToken(id);
    
    // 返回临时下载链接
    res.json({
      downloadUrl: `${config.domain}/attachments/download/${tempToken}`,
      filename: metadata.filename,
      size: metadata.size,
      mimeType: metadata.mimeType,
      expiresIn: '5 minutes'
    });
    
  } catch (error) {
    console.error('获取附件下载链接错误:', error);
    res.status(500).json({
      error: 'Internal server error while generating download link'
    });
  }
}

/**
 * 附件下载处理器（使用临时token）
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 */
async function downloadAttachmentHandler(req, res) {
  try {
    const { token } = req.params;
    
    // 验证临时token参数
    if (!token) {
      return res.status(400).json({
        error: 'Download token is required'
      });
    }
    
    // 验证临时token并获取附件ID
    const attachmentId = validateTempToken(token);
    
    if (!attachmentId) {
      return res.status(401).json({
        error: 'Invalid or expired download token'
      });
    }
    
    // 获取附件
    const attachment = await getAttachment(attachmentId);
    
    // 检查附件是否存在或已过期
    if (!attachment) {
      return res.status(404).json({
        error: 'Attachment not found or expired'
      });
    }
    
    const { metadata, content } = attachment;
    
    // 设置响应头
    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader('Content-Length', metadata.size);
    
    // 对文件名进行编码以处理特殊字符
    const encodedFilename = encodeURIComponent(metadata.filename);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    
    // 返回文件内容
    res.send(content);
    
  } catch (error) {
    console.error('附件下载错误:', error);
    res.status(500).json({
      error: 'Internal server error while downloading attachment'
    });
  }
}

export { getAttachmentDownloadLinkHandler, downloadAttachmentHandler };