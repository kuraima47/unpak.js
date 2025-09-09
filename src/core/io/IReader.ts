/**
 * Core interface for binary data reading operations
 * Provides a consistent API for reading different types of data from binary sources
 */
export interface IReader {
  /** Current position in the data stream */
  readonly position: number;
  
  /** Total size of the data stream */
  readonly size: number;
  
  /** Check if we've reached the end of the stream */
  readonly isEof: boolean;

  // Position control
  seek(position: number): void;
  skip(bytes: number): void;
  
  // Basic data types
  readUInt8(): number;
  readUInt16(): number;
  readUInt32(): number;
  readUInt64(): bigint;
  readInt8(): number;
  readInt16(): number;
  readInt32(): number;
  readInt64(): bigint;
  readFloat32(): number;
  readFloat64(): number;
  
  // String operations
  readString(length?: number, encoding?: BufferEncoding): string;
  readCString(encoding?: BufferEncoding): string;
  
  // Buffer operations
  readBuffer(length: number): Buffer;
  readBytes(length: number): Uint8Array;
  
  // UE4 specific types
  readGuid(): string;
  readFName(): { index: number; number: number };
  
  // Utility
  slice(start: number, end?: number): Buffer;
  clone(): IReader;
}