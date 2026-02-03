import PostalMime from "postal-mime";

/**
 * 将日期转换为北京时间格式 (UTC+8)
 * @param {string|Date} dateInput - 输入的日期
 * @returns {string} 格式化后的日期字符串 (yyyy-MM-dd HH:mm:ss)
 */
function formatDateToBeijingTime(dateInput) {
  try {
    const date = new Date(dateInput);

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return null;
    }

    // 转换为北京时间 (UTC+8)
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

    // 格式化为 yyyy-MM-dd HH:mm:ss
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, "0");
    const day = String(beijingTime.getUTCDate()).padStart(2, "0");
    const hours = String(beijingTime.getUTCHours()).padStart(2, "0");
    const minutes = String(beijingTime.getUTCMinutes()).padStart(2, "0");
    const seconds = String(beijingTime.getUTCSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.warn("日期格式化失败:", error.message);
    return null;
  }
}

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

  return addressArray.map((addr) => {
    if (typeof addr === "string") {
      // 如果是纯字符串，尝试解析
      const emailMatch = addr.match(/<(.+?)>/);
      if (emailMatch) {
        // 格式: "Name <email@domain.com>"
        const name = addr
          .replace(/<.+?>/, "")
          .trim()
          .replace(/^["']|["']$/g, "");
        return {
          name: name || emailMatch[1],
          address: emailMatch[1],
        };
      } else {
        // 纯邮箱地址
        return {
          name: addr,
          address: addr,
        };
      }
    }

    // 如果已经是对象，确保包含必需字段
    return {
      name: addr.name || addr.address || "",
      address: addr.address || addr.email || "",
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
    return { name: "", address: "" };
  }

  const formatted = formatAddresses(address);
  return formatted[0] || { name: "", address: "" };
}

/**
 * 处理HTML中的内嵌图片引用
 * @param {string} html - 原始HTML内容
 * @param {Array} attachments - 附件数组
 * @param {Map} cidToAttachmentMap - CID到附件的映射
 * @returns {string} 处理后的HTML内容
 */
function processInlineImages(html, attachments, cidToAttachmentMap) {
  if (!html || !attachments.length) {
    return html;
  }

  // 查找HTML中所有的cid:引用
  const cidRegex = /src=["']cid:([^"']+)["']/gi;

  return html.replace(cidRegex, (match, cid) => {
    // 查找对应的附件
    const attachment = cidToAttachmentMap.get(cid);
    if (attachment) {
      // 标记为内嵌图片
      attachment.isInline = true;

      // 使用Base64编码直接嵌入图片
      if (attachment.content) {
        try {
          let contentBuffer;
          if (attachment.content instanceof ArrayBuffer) {
            contentBuffer = Buffer.from(attachment.content);
          } else if (Buffer.isBuffer(attachment.content)) {
            contentBuffer = attachment.content;
          } else {
            contentBuffer = Buffer.from(attachment.content);
          }

          const base64Data = contentBuffer.toString("base64");
          const mimeType = attachment.mimeType || "image/png";
          return `src="data:${mimeType};base64,${base64Data}"`;
        } catch (error) {
          console.warn(`无法编码内嵌图片 ${cid}:`, error.message);
          // 如果Base64编码失败，返回错误占位符
          return `src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+aXoOazleaYvuekujwvdGV4dD48L3N2Zz4=" alt="图片无法显示"`;
        }
      }
    }
    // 如果没找到对应的附件，保持原样
    return match;
  });
}

/**
 * 创建Content-ID到附件的映射
 * @param {Array} attachments - 附件数组
 * @returns {Map} CID到附件的映射
 */
function createCidToAttachmentMap(attachments) {
  const cidMap = new Map();

  attachments.forEach((attachment) => {
    // 检查附件是否有Content-ID
    if (attachment.contentId) {
      // 移除Content-ID两端的尖括号（如果有的话）
      const cid = attachment.contentId.replace(/^<|>$/g, "");
      cidMap.set(cid, attachment);
    }
  });

  return cidMap;
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

    // 创建CID到附件的映射
    const cidToAttachmentMap = createCidToAttachmentMap(
      parsed.attachments || [],
    );

    // 处理HTML中的内嵌图片
    const processedHtml = processInlineImages(
      parsed.html || "",
      parsed.attachments || [],
      cidToAttachmentMap,
    );

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
      subject: parsed.subject || "",

      // 邮件日期 (+8时区，格式: yyyy-MM-dd HH:mm:ss)
      date: parsed.date ? formatDateToBeijingTime(parsed.date) : null,

      // 邮件ID
      messageId: parsed.messageId || "",

      // 纯文本正文
      text: parsed.text || "",

      // HTML正文（已处理内嵌图片）
      html: processedHtml,

      // 附件信息
      attachments: parsed.attachments || [],

      // CID映射信息（用于后续处理）
      cidToAttachmentMap: Object.fromEntries(cidToAttachmentMap),
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
  const text = new TextDecoder("utf-8", { fatal: false }).decode(
    uint8Array.slice(0, 1000),
  );

  // 检查是否包含基本的邮件头部字段
  const hasHeaders =
    /^(From|To|Subject|Date|Message-ID|Received|Return-Path|Delivered-To):/im.test(
      text,
    ) ||
    /\r?\n(From|To|Subject|Date|Message-ID|Received|Return-Path|Delivered-To):/im.test(
      text,
    );

  if (!hasHeaders) {
    console.log("邮件内容", text);
  }

  console.log("正常内容", text);
  return hasHeaders;
}

export default {
  parseEmail,
  validateEmailData,
  formatAddresses,
  formatSingleAddress,
};
