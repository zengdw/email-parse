import PostalMime from 'postal-mime';

/**
 * 格式化邮件地址，确保包含 name 和 address 字段
 * @param {Object|Array} addresses - 地址对象或地址数组
 * @returns {Object|Array} 格式化后的地址
 */
export function formatAddresses(addresses) {
  if (!addresses) {
    return [];
  }

  // 如果是单个地址对象，转换为数组处理
  const addressArray = Array.isArray(addresses) ? addresses : [addresses];
  
  return addressArray.map(addr => {
    if (typeof addr === 'string') {
      // 如果是纯字符串，尝试解析
      const emailMatch = addr.match(/<(.+?)>/);
      if (emailMatch) {
        // 格式: "Name <email@domain.com>"
        const name = addr.replace(/<.+?>/, '').trim().replace(/^["']|["']$/g, '');
        return {
          name: name || emailMatch[1],
          address: emailMatch[1]
        };
      } else {
        // 纯邮箱地址
        return {
          name: addr,
          address: addr
        };
      }
    }
    
    // 如果已经是对象，确保包含必需字段
    return {
      name: addr.name || addr.address || '',
      address: addr.address || addr.email || ''
    };
  });
}

/**
 * 格式化单个地址（用于 from 字段）
 * @param {Object|string} address - 地址对象或字符串
 * @returns {Object} 格式化后的地址对象
 */
export function formatSingleAddress(address) {
  if (!address) {
    return { name: '', address: '' };
  }

  const formatted = formatAddresses(address);
  return formatted[0] || { name: '', address: '' };
}

/**
 * 解析邮件内容
 * @param {ArrayBuffer} emailBuffer - 邮件原始数据
 * @returns {Promise<Object>} 解析后的邮件对象
 */
export async function parseEmail(emailBuffer) {
  try {
    // 创建 PostalMime 实例并解析邮件
    const parser = new PostalMime();
    const parsed = await parser.parse(emailBuffer);
    
    // 格式化解析结果
    const result = {
      // 发件人信息（单个对象）
      from: formatSingleAddress(parsed.from),
      
      // 收件人信息（数组）
      to: formatAddresses(parsed.to),
      
      // 抄送信息（数组）
      cc: formatAddresses(parsed.cc),
      
      // 密送信息（数组）
      bcc: formatAddresses(parsed.bcc),
      
      // 邮件主题
      subject: parsed.subject || '',
      
      // 邮件日期
      date: parsed.date ? new Date(parsed.date).toISOString() : null,
      
      // 邮件ID
      messageId: parsed.messageId || '',
      
      // 纯文本正文
      text: parsed.text || '',
      
      // HTML正文
      html: parsed.html || '',
      
      // 附件信息
      attachments: parsed.attachments || []
    };
    
    return result;
  } catch (error) {
    throw new Error(`邮件解析失败: ${error.message}`);
  }
}

/**
 * 验证邮件数据是否有效
 * @param {ArrayBuffer} emailBuffer - 邮件原始数据
 * @returns {boolean} 是否为有效的邮件数据
 */
export function validateEmailData(emailBuffer) {
  if (!emailBuffer || emailBuffer.byteLength === 0) {
    return false;
  }
  
  // 基本的邮件格式检查 - 查找邮件头部标识
  const uint8Array = new Uint8Array(emailBuffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array.slice(0, 1000));

  // 检查是否包含基本的邮件头部字段
  const hasHeaders = /^(From|To|Subject|Date|Message-ID|Received|Return-Path|Delivered-To):/mi.test(text) ||
                    /\r?\n(From|To|Subject|Date|Message-ID|Received|Return-Path|Delivered-To):/mi.test(text);
  
  return hasHeaders;
}

export default {
  parseEmail,
  validateEmailData,
  formatAddresses,
  formatSingleAddress
};