import { IReader } from './IReader';

/**
 * Implementation of IReader using Node.js Buffer
 * Provides efficient binary data reading with proper bounds checking
 */
export class BufferReader implements IReader {
  private _position: number = 0;
  private readonly _buffer: Buffer;

  constructor(buffer: Buffer) {
    this._buffer = buffer;
  }

  get position(): number {
    return this._position;
  }

  get size(): number {
    return this._buffer.length;
  }

  get isEof(): boolean {
    return this._position >= this._buffer.length;
  }

  seek(position: number): void {
    if (position < 0 || position > this._buffer.length) {
      throw new Error(`Seek position ${position} is out of bounds (0-${this._buffer.length})`);
    }
    this._position = position;
  }

  skip(bytes: number): void {
    this.seek(this._position + bytes);
  }

  private checkBounds(bytes: number): void {
    if (this._position + bytes > this._buffer.length) {
      throw new Error(`Read beyond buffer bounds: ${this._position + bytes} > ${this._buffer.length}`);
    }
  }

  readUInt8(): number {
    this.checkBounds(1);
    const value = this._buffer.readUInt8(this._position);
    this._position += 1;
    return value;
  }

  readUInt16(): number {
    this.checkBounds(2);
    const value = this._buffer.readUInt16LE(this._position);
    this._position += 2;
    return value;
  }

  readUInt32(): number {
    this.checkBounds(4);
    const value = this._buffer.readUInt32LE(this._position);
    this._position += 4;
    return value;
  }

  readUInt64(): bigint {
    this.checkBounds(8);
    const value = this._buffer.readBigUInt64LE(this._position);
    this._position += 8;
    return value;
  }

  readInt8(): number {
    this.checkBounds(1);
    const value = this._buffer.readInt8(this._position);
    this._position += 1;
    return value;
  }

  readInt16(): number {
    this.checkBounds(2);
    const value = this._buffer.readInt16LE(this._position);
    this._position += 2;
    return value;
  }

  readInt32(): number {
    this.checkBounds(4);
    const value = this._buffer.readInt32LE(this._position);
    this._position += 4;
    return value;
  }

  readInt64(): bigint {
    this.checkBounds(8);
    const value = this._buffer.readBigInt64LE(this._position);
    this._position += 8;
    return value;
  }

  readFloat32(): number {
    this.checkBounds(4);
    const value = this._buffer.readFloatLE(this._position);
    this._position += 4;
    return value;
  }

  readFloat64(): number {
    this.checkBounds(8);
    const value = this._buffer.readDoubleLE(this._position);
    this._position += 8;
    return value;
  }

  readString(length?: number, encoding: BufferEncoding = 'utf8'): string {
    if (length === undefined) {
      // Read until null terminator
      return this.readCString(encoding);
    }
    
    this.checkBounds(length);
    const value = this._buffer.subarray(this._position, this._position + length).toString(encoding);
    this._position += length;
    return value;
  }

  readCString(encoding: BufferEncoding = 'utf8'): string {
    const start = this._position;
    let end = start;
    
    while (end < this._buffer.length && this._buffer[end] !== 0) {
      end++;
    }
    
    const value = this._buffer.subarray(start, end).toString(encoding);
    this._position = end + 1; // Skip null terminator
    return value;
  }

  readBuffer(length: number): Buffer {
    this.checkBounds(length);
    const value = this._buffer.subarray(this._position, this._position + length);
    this._position += length;
    return value;
  }

  readBytes(length: number): Uint8Array {
    return new Uint8Array(this.readBuffer(length));
  }

  readGuid(): string {
    const a = this.readUInt32();
    const b = this.readUInt16();
    const c = this.readUInt16();
    const d = this.readUInt16();
    const e = this.readUInt32();
    const f = this.readUInt16();
    
    return `${a.toString(16).padStart(8, '0')}-${b.toString(16).padStart(4, '0')}-${c.toString(16).padStart(4, '0')}-${d.toString(16).padStart(4, '0')}-${e.toString(16).padStart(8, '0')}${f.toString(16).padStart(4, '0')}`.toUpperCase();
  }

  readFName(): { index: number; number: number } {
    const index = this.readUInt32();
    const number = this.readUInt32();
    return { index, number };
  }

  slice(start: number, end?: number): Buffer {
    return this._buffer.subarray(start, end);
  }

  clone(): BufferReader {
    const cloned = new BufferReader(this._buffer);
    cloned._position = this._position;
    return cloned;
  }
}