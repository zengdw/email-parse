/**
 * 附件存储服务属性测试
 * **Validates: Requirements 5.1, 5.4, 6.1, 6.2**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import fs from 'fs/promises';
import {
  isAttachmentSizeExceeded,
  getSkipReason,
  saveAttachment,
  getAttachment,
  cleanupExpiredAttachments
} from './attachmentStorage.js';

// 模拟配置
vi.mock('../config.js', () => ({
  default: {
    maxAttachmentSize: 1024, // 1KB for testing
    attachmentDir: './test-attachments-property',
    attachmentTtl: 60000 // 1分钟 for testing
  }
}));

describe('附件存储服务属性测试', () => {
  beforeEach(async () => {
    // 清理测试目录
    try {
      await fs.rm('./test-attachments-property', { recursive: true, force: true });
    } catch (error) {
      // 目录可能不存在，忽略错误
    }
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm('./test-attachments-property', { recursive: true, force: true });
    } catch (error) {
      // 目录可能不存在，忽略错误
    }
  });

  describe('P4: 附件存储一致性', () => {
    it('对于任意未超限的附件，存储后通过下载接口获取的内容必须与原始内容完全一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成未超限的附件数据
          fc.record({
            content: fc.uint8Array({ minLength: 1, maxLength: 1024 }),
            filename: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('\\')),
            mimeType: fc.oneof(
              fc.constant('text/plain'),
              fc.constant('application/pdf'),
              fc.constant('image/jpeg'),
              fc.constant('application/json')
            )
          }),
          async ({ content, filename, mimeType }) => {
            const contentBuffer = Buffer.from(content);
            
            // 保存附件
            const { id } = await saveAttachment(contentBuffer, filename, mimeType);
            
            // 检索附件
            const result = await getAttachment(id);
            
            // 验证内容一致性
            expect(result).not.toBeNull();
            expect(result.content).toEqual(contentBuffer);
            expect(result.metadata.filename).toBe(filename);
            expect(result.metadata.mimeType).toBe(mimeType);
            expect(result.metadata.size).toBe(contentBuffer.length);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('P5: 附件大小限制', () => {
    it('对于任意超过大小限制的附件，必须正确识别为超限', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1025, max: 10000 }), // 生成超过1024字节的大小
          (size) => {
            expect(isAttachmentSizeExceeded(size)).toBe(true);
            
            const skipReason = getSkipReason(size);
            expect(skipReason).toContain('exceeds limit');
            expect(skipReason).toContain('MB');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('对于任意未超过大小限制的附件，必须正确识别为未超限', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1024 }), // 生成不超过1024字节的大小
          (size) => {
            expect(isAttachmentSizeExceeded(size)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('P6: 附件ID唯一性', () => {
    it('对于任意附件，生成的ID必须是唯一的UUID格式', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              content: fc.uint8Array({ minLength: 1, maxLength: 100 }),
              filename: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/') && !s.includes('\\')),
              mimeType: fc.constant('text/plain')
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (attachments) => {
            const ids = new Set();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
            
            for (const { content, filename, mimeType } of attachments) {
              const contentBuffer = Buffer.from(content);
              const { id } = await saveAttachment(contentBuffer, filename, mimeType);
              
              // 验证UUID格式
              expect(id).toMatch(uuidRegex);
              
              // 验证唯一性
              expect(ids.has(id)).toBe(false);
              ids.add(id);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('P7: 附件元数据完整性', () => {
    it('对于任意有效附件，元数据必须包含所有必需字段且类型正确', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            content: fc.uint8Array({ minLength: 1, maxLength: 500 }),
            filename: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('/') && !s.includes('\\')),
            mimeType: fc.oneof(
              fc.constant('text/plain'),
              fc.constant('application/pdf'),
              fc.constant('image/png')
            )
          }),
          async ({ content, filename, mimeType }) => {
            const contentBuffer = Buffer.from(content);
            const { id } = await saveAttachment(contentBuffer, filename, mimeType);
            
            const result = await getAttachment(id);
            
            expect(result).not.toBeNull();
            expect(result.metadata).toHaveProperty('filename');
            expect(result.metadata).toHaveProperty('mimeType');
            expect(result.metadata).toHaveProperty('size');
            expect(result.metadata).toHaveProperty('filePath');
            expect(result.metadata).toHaveProperty('createdAt');
            
            expect(typeof result.metadata.filename).toBe('string');
            expect(typeof result.metadata.mimeType).toBe('string');
            expect(typeof result.metadata.size).toBe('number');
            expect(typeof result.metadata.filePath).toBe('string');
            expect(typeof result.metadata.createdAt).toBe('number');
            
            expect(result.metadata.filename).toBe(filename);
            expect(result.metadata.mimeType).toBe(mimeType);
            expect(result.metadata.size).toBe(contentBuffer.length);
            expect(result.metadata.createdAt).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});