import { IReader } from '../../core/io/IReader';
import { BufferReader } from '../../core/io/BufferReader';
import { 
  IPakInfo, 
  IPakEntry, 
  ICompressionBlock, 
  PAK_MAGIC, 
  PakVersion, 
  CompressionMethod,
  PAK_CONSTANTS 
} from './PakStructures';
import { ArchiveError, UnsupportedFormatError } from '../../core/errors/UnpakErrors';
import { logger } from '../../core/logging/Logger';

/**
 * Parser for PAK file headers and index data
 */
export class PakParser {
  
  /**
   * Parse PAK info structure from the end of the file
   */
  static parsePakInfo(reader: IReader): IPakInfo {
    // PAK info is at the end of the file
    const infoOffset = reader.size - PAK_CONSTANTS.INFO_SIZE;
    reader.seek(infoOffset);
    
    const encryptionKeyGuid = reader.readGuid();
    const encryptedIndex = reader.readUInt8() !== 0;
    const magic = reader.readUInt32();
    
    if (magic !== PAK_MAGIC) {
      throw new ArchiveError(`Invalid PAK magic: 0x${magic.toString(16).toUpperCase()}, expected 0x${PAK_MAGIC.toString(16).toUpperCase()}`);
    }
    
    const version = reader.readUInt32() as PakVersion;
    const indexOffset = reader.readUInt64();
    const indexSize = reader.readUInt64();
    const indexHash = reader.readBuffer(PAK_CONSTANTS.HASH_SIZE);
    
    // Version 8+ has frozen index flag
    let frozenIndex = false;
    if (version >= PakVersion.FROZEN_INDEX) {
      frozenIndex = reader.readUInt8() !== 0;
    }
    
    // Version 8+ has compression methods array
    const compressionMethods: CompressionMethod[] = [];
    if (version >= PakVersion.FNAME_BASED_COMPRESSION_METHOD) {
      // Read compression methods (simplified for now)
      compressionMethods.push(CompressionMethod.NONE);
      compressionMethods.push(CompressionMethod.ZLIB);
    }
    
    logger.info('Parsed PAK info', {
      version,
      indexOffset: indexOffset.toString(),
      indexSize: indexSize.toString(),
      encryptedIndex,
      frozenIndex
    });
    
    return {
      encryptionKeyGuid,
      encryptedIndex,
      magic,
      version,
      indexOffset,
      indexSize,
      indexHash,
      frozenIndex,
      compressionMethods
    };
  }
  
  /**
   * Parse the PAK index to extract file entries
   */
  static parseIndex(reader: IReader, pakInfo: IPakInfo): IPakEntry[] {
    reader.seek(Number(pakInfo.indexOffset));
    const indexData = reader.readBuffer(Number(pakInfo.indexSize));
    
    if (pakInfo.encryptedIndex) {
      throw new UnsupportedFormatError('Encrypted PAK index', pakInfo.version);
    }
    
    const indexReader = new BufferReader(indexData);
    return this.parseIndexEntries(indexReader, pakInfo.version);
  }
  
  /**
   * Parse individual file entries from the index
   */
  private static parseIndexEntries(reader: IReader, version: PakVersion): IPakEntry[] {
    const entries: IPakEntry[] = [];
    
    // Read mount point (null-terminated string)
    const mountPoint = reader.readCString();
    logger.debug('PAK mount point', { mountPoint });
    
    // Read number of entries
    const entryCount = reader.readUInt32();
    logger.debug('PAK entry count', { entryCount });
    
    for (let i = 0; i < entryCount; i++) {
      const entry = this.parseEntry(reader, version);
      entries.push(entry);
      
      if (i % 1000 === 0) {
        logger.debug('Parsed PAK entries', { progress: i, total: entryCount });
      }
    }
    
    logger.info('Parsed PAK index', { entryCount: entries.length });
    return entries;
  }
  
  /**
   * Parse a single file entry
   */
  private static parseEntry(reader: IReader, version: PakVersion): IPakEntry {
    const filename = reader.readCString();
    const offset = reader.readUInt64();
    const size = reader.readUInt64();
    const uncompressedSize = reader.readUInt64();
    
    let compressionMethod = CompressionMethod.NONE;
    if (version >= PakVersion.COMPRESSION_ENCRYPTION) {
      compressionMethod = reader.readUInt32() as CompressionMethod;
    }
    
    const hash = reader.readBuffer(PAK_CONSTANTS.HASH_SIZE);
    
    let compressionBlocks: ICompressionBlock[] = [];
    if (version >= PakVersion.COMPRESSION_ENCRYPTION) {
      const blockCount = reader.readUInt32();
      for (let i = 0; i < blockCount; i++) {
        compressionBlocks.push({
          compressedStart: reader.readUInt64(),
          compressedEnd: reader.readUInt64(),
          uncompressedStart: reader.readUInt64(),
          uncompressedEnd: reader.readUInt64()
        });
      }
    }
    
    let encrypted = false;
    if (version >= PakVersion.COMPRESSION_ENCRYPTION) {
      encrypted = reader.readUInt8() !== 0;
    }
    
    let compressionBlockSize = PAK_CONSTANTS.DEFAULT_COMPRESSION_BLOCK_SIZE;
    if (version >= PakVersion.COMPRESSION_ENCRYPTION) {
      compressionBlockSize = reader.readUInt32();
    }
    
    return {
      filename,
      offset,
      size,
      uncompressedSize,
      compressionMethod,
      hash,
      compressionBlocks,
      encrypted,
      compressionBlockSize
    };
  }
}