/**
 * 附件下载控制器
 * 处理 GET /attachments/:id 请求
 */

import { getAttachment } from '../services/attachmentStorage.js';

/**
 * 附件下载处理器
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 */
async function downloadAttachmentHandler(req, res) {
  try {
    const { id } = req.params;
    
    // 验证附件ID参数
    if (!id) {
      return res.status(400).json({
        error: 'Attachment ID is required'
      });
    }
    
    // 获取附件
    const attachment = await getAttachment(id);
    
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

export { downloadAttachmentHandler };