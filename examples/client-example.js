/**
 * 邮件解析服务客户端示例
 * 
 * 使用方法：
 * 1. 确保服务已启动：npm start
 * 2. 设置环境变量：export API_TOKEN=your-secret-token
 * 3. 运行示例：node examples/client-example.js
 */

import fs from 'fs';
import path from 'path';

const API_TOKEN = process.env.API_TOKEN || 'test-token-123';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * 解析邮件
 */
async function parseEmail(emailFilePath) {
  console.log(`📧 正在解析邮件: ${emailFilePath}`);
  
  try {
    const emailData = fs.readFileSync(emailFilePath);
    
    const response = await fetch(`${BASE_URL}/parse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/octet-stream'
      },
      body: emailData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP ${response.status}: ${error.error}`);
    }
    
    const result = await response.json();
    console.log('✅ 邮件解析成功！');
    
    return result;
  } catch (error) {
    console.error('❌ 邮件解析失败:', error.message);
    throw error;
  }
}

/**
 * 下载附件
 */
async function downloadAttachment(attachmentId, filename, outputDir = './downloads') {
  console.log(`📎 正在下载附件: ${filename}`);
  
  try {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const response = await fetch(`${BASE_URL}/attachments/${attachmentId}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP ${response.status}: ${error.error}`);
    }
    
    const buffer = await response.arrayBuffer();
    const outputPath = path.join(outputDir, filename);
    
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`✅ 附件已下载到: ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error(`❌ 附件下载失败 (${filename}):`, error.message);
    throw error;
  }
}

/**
 * 检查服务健康状态
 */
async function checkHealth() {
  console.log('🔍 检查服务状态...');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ 服务运行正常:', result);
    
    return true;
  } catch (error) {
    console.error('❌ 服务不可用:', error.message);
    return false;
  }
}

/**
 * 显示邮件信息摘要
 */
function displayEmailSummary(emailData) {
  console.log('\n📋 邮件信息摘要:');
  console.log('─'.repeat(50));
  
  console.log(`发件人: ${emailData.from.name} <${emailData.from.address}>`);
  
  if (emailData.to.length > 0) {
    console.log(`收件人: ${emailData.to.map(addr => `${addr.name} <${addr.address}>`).join(', ')}`);
  }
  
  if (emailData.cc.length > 0) {
    console.log(`抄送: ${emailData.cc.map(addr => `${addr.name} <${addr.address}>`).join(', ')}`);
  }
  
  console.log(`主题: ${emailData.subject}`);
  console.log(`日期: ${emailData.date}`);
  console.log(`邮件ID: ${emailData.messageId}`);
  
  if (emailData.text) {
    const preview = emailData.text.substring(0, 100);
    console.log(`正文预览: ${preview}${emailData.text.length > 100 ? '...' : ''}`);
  }
  
  console.log(`附件数量: ${emailData.attachments.length}`);
  
  if (emailData.attachments.length > 0) {
    console.log('\n📎 附件列表:');
    emailData.attachments.forEach((attachment, index) => {
      const status = attachment.skipped ? '❌ 已跳过' : '✅ 可下载';
      const reason = attachment.skipReason ? ` (${attachment.skipReason})` : '';
      console.log(`  ${index + 1}. ${attachment.filename} (${formatFileSize(attachment.size)}) ${status}${reason}`);
    });
  }
  
  console.log('─'.repeat(50));
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 邮件解析服务客户端示例');
  console.log(`📡 服务地址: ${BASE_URL}`);
  console.log(`🔑 使用Token: ${API_TOKEN.substring(0, 8)}...`);
  console.log('');
  
  try {
    // 1. 检查服务健康状态
    const isHealthy = await checkHealth();
    if (!isHealthy) {
      console.log('\n💡 请确保服务已启动：npm start');
      process.exit(1);
    }
    
    // 2. 解析示例邮件
    const emailPath = path.join(process.cwd(), 'examples', 'sample-email.eml');
    
    if (!fs.existsSync(emailPath)) {
      throw new Error(`示例邮件文件不存在: ${emailPath}`);
    }
    
    const emailData = await parseEmail(emailPath);
    
    // 3. 显示邮件信息
    displayEmailSummary(emailData);
    
    // 4. 下载附件
    const downloadableAttachments = emailData.attachments.filter(att => !att.skipped);
    
    if (downloadableAttachments.length > 0) {
      console.log('\n📥 开始下载附件...');
      
      for (const attachment of downloadableAttachments) {
        try {
          await downloadAttachment(attachment.id, attachment.filename);
        } catch (error) {
          console.error(`跳过附件 ${attachment.filename}: ${error.message}`);
        }
      }
    } else {
      console.log('\n📝 没有可下载的附件');
    }
    
    console.log('\n🎉 示例执行完成！');
    
  } catch (error) {
    console.error('\n💥 示例执行失败:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 提示：');
      console.log('1. 请确保服务已启动：npm start');
      console.log('2. 检查服务地址是否正确');
    } else if (error.message.includes('Unauthorized')) {
      console.log('\n💡 提示：');
      console.log('1. 请设置正确的API_TOKEN环境变量');
      console.log('2. 确保token与服务端配置一致');
    }
    
    process.exit(1);
  }
}

// 运行示例
main();