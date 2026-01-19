#!/usr/bin/env node

/**
 * 快速启动脚本
 * 自动设置环境变量并启动服务
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

console.log('🚀 邮件解析HTTP服务 - 快速启动');
console.log('================================');

// 检查 .env 文件
const envPath = path.join(rootDir, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 创建 .env 配置文件...');
  
  // 复制 .env.example 到 .env
  const examplePath = path.join(rootDir, '.env.example');
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
  }
  
  // 生成随机 API Token
  const randomToken = generateRandomToken();
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace('your-secret-token-here', randomToken);
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ 已创建 .env 文件，API Token: ${randomToken}`);
} else {
  console.log('✅ 发现现有 .env 配置文件');
}

// 检查依赖
console.log('📦 检查依赖...');
const packageJsonPath = path.join(rootDir, 'package.json');
const nodeModulesPath = path.join(rootDir, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('📥 安装依赖包...');
  
  const installCmd = detectPackageManager();
  console.log(`使用 ${installCmd} 安装依赖...`);
  
  const install = spawn(installCmd, ['install'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ 依赖安装完成');
      startService();
    } else {
      console.error('❌ 依赖安装失败');
      process.exit(1);
    }
  });
} else {
  console.log('✅ 依赖已安装');
  startService();
}

function generateRandomToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function detectPackageManager() {
  if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  } else if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) {
    return 'yarn';
  } else {
    return 'npm';
  }
}

function startService() {
  console.log('🎯 启动服务...');
  console.log('');
  
  const service = spawn('node', ['src/index.js'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });
  
  // 处理进程退出
  process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务...');
    service.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n👋 正在关闭服务...');
    service.kill('SIGTERM');
  });
  
  service.on('close', (code) => {
    console.log(`\n📊 服务已退出，退出码: ${code}`);
    process.exit(code);
  });
}