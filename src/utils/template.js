/**
 * 简单的模板渲染工具
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 渲染 HTML 模板
 * @param {string} templateName - 模板文件名
 * @param {Object} variables - 要替换的变量
 * @returns {string} 渲染后的 HTML
 */
export function renderTemplate(templateName, variables = {}) {
  const templatePath = path.join(__dirname, '../templates', templateName);
  let html = fs.readFileSync(templatePath, 'utf-8');
  
  // 替换模板变量 {{VARIABLE_NAME}}
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    html = html.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return html;
}