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
 * 将 ReadableStream<Uint8Array> 转换为 Buffer
 * @param {ReadableStream<Uint8Array>} stream - 输入流
 * @returns {Promise<Buffer>} 转换后的 Buffer
 */
async function streamToBuffer(stream) {
  const reader = stream.getReader();
  const chunks = [];
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  
  // 计算总长度
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  
  // 合并所有 chunks
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return Buffer.from(result);
}

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
      disposition: attachment.disposition || 'attachment',
      contentId: attachment.contentId || null,
      isInline: attachment.isInline || false
    };

    // 内嵌图片已经通过Base64编码处理，不需要保存到文件系统
    if (attachmentInfo.isInline) {
      // 内嵌图片不提供下载链接
      attachmentInfo.skipped = true;
      attachmentInfo.skipReason = '内嵌图片已通过Base64编码处理';
    } else {
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
    }

    processedAttachments.push(attachmentInfo);
  }

  return processedAttachments;
}

/**
 * 替换HTML中的内嵌图片占位符为实际的下载URL
 * @param {string} html - 包含占位符的HTML内容
 * @param {Map} cidToUrlMap - CID到下载URL的映射
 * @returns {string} 替换后的HTML内容
 */
function replaceInlineImagePlaceholders(html, cidToUrlMap) {
  if (!html || cidToUrlMap.size === 0) {
    return html;
  }

  // 替换占位符为实际的下载URL
  const placeholderRegex = /src="{{INLINE_IMAGE:([^}]+)}}"/g;
  
  return html.replace(placeholderRegex, (match, cid) => {
    const downloadUrl = cidToUrlMap.get(cid);
    if (downloadUrl) {
      return `src="${downloadUrl}"`;
    }
    // 如果没找到对应的URL，返回一个错误占位符
    return `src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+aXoOazleaYvuekujwvdGV4dD48L3N2Zz4=" alt="图片无法显示"`;
  });
}

/**
 * 邮件解析处理函数
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
export async function parseEmailHandler(req, res) {
  try {
    // 将 ReadableStream<Uint8Array> 转换为 Buffer
    let bodyBuffer;
    try {
      if (req.body && typeof req.body.getReader === 'function') {
        // 如果是 ReadableStream
        bodyBuffer = await streamToBuffer(req.body);
      } else if (Buffer.isBuffer(req.body)) {
        // 如果已经是 Buffer
        bodyBuffer = req.body;
      } else {
        // 其他情况，尝试转换
        bodyBuffer = Buffer.from(req.body);
      }
    } catch (error) {
      return res.status(400).json({
        error: `请求体转换失败: ${error.message}`
      });
    }

    // 验证请求体
    const validation = validateRequestBody(bodyBuffer);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error
      });
    }

    // 将Buffer转换为ArrayBuffer
    const arrayBuffer = bodyBuffer.buffer.slice(
      bodyBuffer.byteOffset, 
      bodyBuffer.byteOffset + bodyBuffer.byteLength
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