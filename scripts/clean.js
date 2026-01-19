#!/usr/bin/env node

/**
 * 跨平台清理脚本
 * 删除临时文件和目录
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// 需要清理的目录列表
const dirsToClean = [
  'attachments',
  'downloads', 
  'coverage',
  'test-attachments',
  'test-attachments-property'
];

console.log('🧹 开始清理临时文件...');

let cleanedCount = 0;

for (const dir of dirsToClean) {
  const dirPath = path.join(rootDir, dir);
  
  try {
    // 检查目录是否存在
    await fs.promises.access(dirPath);
    
    // 删除目录及其内容
    await fs.promises.rm(dirPath, { recursive: true, force: true });
    
    console.log(`✅ 已删除: ${dir}`);
    cleanedCount++;
    
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.log(`⚠️  无法删除 ${dir}: ${error.message}`);
    }
    // ENOENT 表示文件不存在，这是正常的，不需要报错
  }
}

if (cleanedCount === 0) {
  console.log('✨ 没有需要清理的文件');
} else {
  console.log(`🎉 清理完成！删除了 ${cleanedCount} 个目录`);
}

// 显示当前磁盘使用情况（可选）
try {
  const stats = await fs.promises.stat(rootDir);
  console.log(`📁 项目目录: ${rootDir}`);
} catch (error) {
  // 忽略错误
}