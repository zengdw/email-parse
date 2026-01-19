/**
 * 邮件解析控制器
 * 处理 POST /parse 请求，解析邮件并处理附件
 */

import { parseEmail, validateEmailData } from '../services/emailParser.js';
import { 
  isAttachmentSizeExceeded, 
  getSkipReason, 
  saveAttachment 
} from '../services/attachmentStorage.js';

/**
 * 验证请求体
 * @param {Buffer} body - 请求体数据
 * @returns {Object} 验证结果 { valid: boolean, error?: string }
 */
function validateRequestBody(body) {
  // 检查请求体是否为空
  if (!body || body.length === 0) {
    return {
      valid: false,
      error: '请求体不能为空'
    };
  }

  // 将Buffer转换为ArrayBuffer进行邮件格式验证
  const arrayBuffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
  
  // 验证邮件数据格式
  if (!validateEmailData(arrayBuffer)) {
    return {
      valid: false,
      error: '无效的邮件格式'
    };
  }

  return { valid: true };
}

/**
 * 处理附件，检查大小限制并保存符合条件的附件
 * @param {Array} attachments - 附件数组
 * @returns {Promise<Array>} 处理后的附件信息数组
 */
async function processAttachments(attachments) {
  const processedAttachments = [];

  for (const attachment of attachments) {
    const attachmentInfo = {
      filename: attachment.filename || 'unnamed',
      mimeType: attachment.mimeType || 'application/octet-stream',
      size: attachment.content ? attachment.content.byteLength || attachment.content.length : 0,
      disposition: attachment.disposition || 'attachment'
    };

    // 检查附件大小是否超限
    if (isAttachmentSizeExceeded(attachmentInfo.size)) {
      // 超限附件标记为跳过
      attachmentInfo.skipped = true;
      attachmentInfo.skipReason = getSkipReason(attachmentInfo.size);
    } else {
      // 保存附件到文件系统
      try {
        // 将 ArrayBuffer 转换为 Buffer
        let contentBuffer;
        if (attachment.content instanceof ArrayBuffer) {
          contentBuffer = Buffer.from(attachment.content);
        } else if (Buffer.isBuffer(attachment.content)) {
          contentBuffer = attachment.content;
        } else {
          // 如果是其他类型，尝试转换
          contentBuffer = Buffer.from(attachment.content);
        }
        
        const { id, downloadUrl } = await saveAttachment(
          contentBuffer,
          attachmentInfo.filename,
          attachmentInfo.mimeType
        );
        
        attachmentInfo.id = id;
        attachmentInfo.downloadUrl = downloadUrl;
      } catch (error) {
        // 保存失败，标记为跳过
        attachmentInfo.skipped = true;
        attachmentInfo.skipReason = `附件保存失败: ${error.message}`;
      }
    }

    processedAttachments.push(attachmentInfo);
  }

  return processedAttachments;
}

/**
 * 邮件解析处理函数
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
export async function parseEmailHandler(req, res) {
  try {
    // 验证请求体
    const validation = validateRequestBody(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error
      });
    }

    // 将Buffer转换为ArrayBuffer
    const arrayBuffer = req.body.buffer.slice(
      req.body.byteOffset, 
      req.body.byteOffset + req.body.byteLength
    );

    // 解析邮件
    let parsedEmail;
    try {
      parsedEmail = await parseEmail(arrayBuffer);
    } catch (error) {
      return res.status(400).json({
        error: `邮件解析失败: ${error.message}`
      });
    }

    // 处理附件
    const processedAttachments = await processAttachments(parsedEmail.attachments || []);

    // 构建响应对象
    const response = {
      from: parsedEmail.from,
      to: parsedEmail.to,
      cc: parsedEmail.cc,
      bcc: parsedEmail.bcc,
      subject: parsedEmail.subject,
      date: parsedEmail.date,
      messageId: parsedEmail.messageId,
      text: parsedEmail.text,
      html: parsedEmail.html,
      attachments: processedAttachments
    };

    // 返回解析结果
    res.status(200).json(response);

  } catch (error) {
    // 服务器内部错误
    console.error('邮件解析控制器错误:', error);
    res.status(500).json({
      error: '服务器内部错误'
    });
  }
}

export default {
  parseEmailHandler
};