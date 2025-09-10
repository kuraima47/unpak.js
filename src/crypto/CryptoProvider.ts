import { createCipheriv, createDecipheriv } from 'crypto';
import { ICryptoProvider, AESMode } from './ICrypto';
import { DecryptionError } from '../core/errors/UnpakErrors';

/**
 * Node.js crypto implementation of ICryptoProvider
 */
export class NodeCryptoProvider implements ICryptoProvider {
  async decryptAES(data: Buffer, key: Buffer, mode: AESMode, iv?: Buffer): Promise<Buffer> {
    try {
      const decipher = createDecipheriv(mode, key, iv || Buffer.alloc(0));
      decipher.setAutoPadding(false); // UE4 doesn't use padding

      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

      return decrypted;
    } catch (error) {
      throw new DecryptionError(
        `AES decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async testKey(data: Buffer, key: Buffer, mode: AESMode, iv?: Buffer): Promise<boolean> {
    try {
      // Try to decrypt a small portion and check if it looks reasonable
      const testData = data.subarray(0, Math.min(16, data.length));
      const decrypted = await this.decryptAES(testData, key, mode, iv);

      // Basic sanity check - decrypted data shouldn't be all zeros or all 0xFF
      const allZeros = decrypted.every(byte => byte === 0);
      const allOnes = decrypted.every(byte => byte === 0xff);

      return !allZeros && !allOnes;
    } catch {
      return false;
    }
  }
}

/**
 * Utility functions for key conversion
 */
export class KeyUtils {
  /**
   * Convert hex string to Buffer
   */
  static hexToBuffer(hex: string): Buffer {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

    if (cleanHex.length % 2 !== 0) {
      throw new Error('Invalid hex string length');
    }

    return Buffer.from(cleanHex, 'hex');
  }

  /**
   * Convert Buffer to hex string
   */
  static bufferToHex(buffer: Buffer): string {
    return '0x' + buffer.toString('hex').toUpperCase();
  }

  /**
   * Validate key length for AES
   */
  static validateKeyLength(key: Buffer): boolean {
    return key.length === 16 || key.length === 24 || key.length === 32;
  }

  /**
   * Normalize key input to Buffer
   */
  static normalizeKey(key: string | Buffer): Buffer {
    if (Buffer.isBuffer(key)) {
      return key;
    }

    return this.hexToBuffer(key);
  }
}
