import { BufferReader } from '../src/core/io/BufferReader';

describe('BufferReader', () => {
  let buffer: Buffer;
  let reader: BufferReader;

  beforeEach(() => {
    // Create a test buffer with known values
    buffer = Buffer.alloc(32);
    buffer.writeUInt8(0x42, 0);           // byte at 0
    buffer.writeUInt16LE(0x1234, 1);      // uint16 at 1
    buffer.writeUInt32LE(0x12345678, 3);  // uint32 at 3
    buffer.writeBigUInt64LE(BigInt(0x123456789ABCDEF0), 7); // uint64 at 7
    buffer.writeFloatLE(3.14159, 15);     // float32 at 15
    buffer.writeDoubleLE(2.718281828, 19); // float64 at 19
    buffer.write('test\0', 27, 'utf8');   // cstring at 27
    
    reader = new BufferReader(buffer);
  });

  describe('basic properties', () => {
    it('should have correct initial state', () => {
      expect(reader.position).toBe(0);
      expect(reader.size).toBe(32);
      expect(reader.isEof).toBe(false);
    });

    it('should track position correctly', () => {
      reader.readUInt8();
      expect(reader.position).toBe(1);
      expect(reader.isEof).toBe(false);
    });

    it('should detect EOF correctly', () => {
      reader.seek(32);
      expect(reader.isEof).toBe(true);
    });
  });

  describe('seek and skip operations', () => {
    it('should seek to valid positions', () => {
      reader.seek(10);
      expect(reader.position).toBe(10);
    });

    it('should throw on invalid seek positions', () => {
      expect(() => reader.seek(-1)).toThrow('Seek position -1 is out of bounds');
      expect(() => reader.seek(33)).toThrow('Seek position 33 is out of bounds');
    });

    it('should skip bytes correctly', () => {
      reader.skip(5);
      expect(reader.position).toBe(5);
    });
  });

  describe('reading primitive types', () => {
    it('should read uint8 correctly', () => {
      expect(reader.readUInt8()).toBe(0x42);
      expect(reader.position).toBe(1);
    });

    it('should read uint16 correctly', () => {
      reader.seek(1);
      expect(reader.readUInt16()).toBe(0x1234);
      expect(reader.position).toBe(3);
    });

    it('should read uint32 correctly', () => {
      reader.seek(3);
      expect(reader.readUInt32()).toBe(0x12345678);
      expect(reader.position).toBe(7);
    });

    it('should read uint64 correctly', () => {
      reader.seek(7);
      expect(reader.readUInt64()).toBe(BigInt(0x123456789ABCDEF0));
      expect(reader.position).toBe(15);
    });

    it('should read float32 correctly', () => {
      reader.seek(15);
      expect(reader.readFloat32()).toBeCloseTo(3.14159, 5);
      expect(reader.position).toBe(19);
    });

    it('should read float64 correctly', () => {
      reader.seek(19);
      expect(reader.readFloat64()).toBeCloseTo(2.718281828, 8);
      expect(reader.position).toBe(27);
    });
  });

  describe('string operations', () => {
    it('should read C-strings correctly', () => {
      reader.seek(27);
      expect(reader.readCString()).toBe('test');
      expect(reader.position).toBe(32); // after null terminator
    });

    it('should read fixed-length strings correctly', () => {
      reader.seek(27);
      expect(reader.readString(4)).toBe('test');
      expect(reader.position).toBe(31);
    });
  });

  describe('bounds checking', () => {
    it('should throw when reading beyond bounds', () => {
      reader.seek(31);
      expect(() => reader.readUInt16()).toThrow('Read beyond buffer bounds');
    });

    it('should throw when reading buffer beyond bounds', () => {
      reader.seek(30);
      expect(() => reader.readBuffer(5)).toThrow('Read beyond buffer bounds');
    });
  });

  describe('GUID reading', () => {
    it('should read GUID correctly', () => {
      const guidBuffer = Buffer.alloc(16);
      guidBuffer.writeUInt32LE(0x12345678, 0);
      guidBuffer.writeUInt16LE(0x1234, 4);
      guidBuffer.writeUInt16LE(0x5678, 6);
      guidBuffer.writeUInt16LE(0x9ABC, 8);
      guidBuffer.writeUInt32LE(0xDEF01234, 10);
      guidBuffer.writeUInt16LE(0x5678, 14);

      const guidReader = new BufferReader(guidBuffer);
      const guid = guidReader.readGuid();
      expect(guid).toMatch(/^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/);
    });
  });

  describe('FName reading', () => {
    it('should read FName correctly', () => {
      const fnameBuffer = Buffer.alloc(8);
      fnameBuffer.writeUInt32LE(123, 0);
      fnameBuffer.writeUInt32LE(456, 4);

      const fnameReader = new BufferReader(fnameBuffer);
      const fname = fnameReader.readFName();
      expect(fname.index).toBe(123);
      expect(fname.number).toBe(456);
    });
  });

  describe('cloning', () => {
    it('should clone with same position', () => {
      reader.seek(10);
      const clone = reader.clone();
      expect(clone.position).toBe(10);
      expect(clone.size).toBe(32);
    });

    it('should maintain independent positions', () => {
      reader.seek(10);
      const clone = reader.clone();
      reader.seek(20);
      expect(clone.position).toBe(10);
      expect(reader.position).toBe(20);
    });
  });
});