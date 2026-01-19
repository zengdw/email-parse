/**
 * 配置模块单元测试
 */

import { describe, it, expect } from 'vitest';
import config from './config.js';

describe('配置模块', () => {
  it('应该成功加载配置', () => {
    expect(config).toBeDefined();
    expect(config.apiToken).toBeDefined();
  });

  it('应该包含所有必需的配置项', () => {
    expect(config).toHaveProperty('port');
    expect(config).toHaveProperty('apiToken');
    expect(config).toHaveProperty('attachmentTtl');
    expect(config).toHaveProperty('maxAttachmentSize');
    expect(config).toHaveProperty('attachmentDir');
  });

  it('应该正确解析数字类型的配置', () => {
    expect(typeof config.port).toBe('number');
    expect(typeof config.attachmentTtl).toBe('number');
    expect(typeof config.maxAttachmentSize).toBe('number');
  });

  it('应该使用合理的默认值', () => {
    // 由于环境变量在 vitest.config.js 中设置，这里验证配置已正确加载
    expect(config.port).toBeGreaterThan(0);
    expect(config.attachmentTtl).toBeGreaterThan(0);
    expect(config.maxAttachmentSize).toBeGreaterThan(0);
    expect(config.attachmentDir).toBeTruthy();
  });
});
