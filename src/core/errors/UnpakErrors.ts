/**
 * Base error class for all unpak.js errors
 */
export class UnpakError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'UnpakError';
  }
}

/**
 * Error thrown when a file is not found in an archive
 */
export class FileNotFoundError extends UnpakError {
  constructor(path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND');
    this.name = 'FileNotFoundError';
  }
}

/**
 * Error thrown when an archive cannot be opened or read
 */
export class ArchiveError extends UnpakError {
  constructor(message: string, public readonly archivePath?: string) {
    super(message, 'ARCHIVE_ERROR');
    this.name = 'ArchiveError';
  }
}

/**
 * Error thrown when decryption fails or keys are missing
 */
export class DecryptionError extends UnpakError {
  constructor(message: string) {
    super(message, 'DECRYPTION_ERROR');
    this.name = 'DecryptionError';
  }
}

/**
 * Error thrown when decompression fails
 */
export class CompressionError extends UnpakError {
  constructor(message: string, public readonly method?: string) {
    super(message, 'COMPRESSION_ERROR');
    this.name = 'CompressionError';
  }
}

/**
 * Error thrown when parsing asset properties fails
 */
export class PropertyError extends UnpakError {
  constructor(message: string, public readonly propertyName?: string) {
    super(message, 'PROPERTY_ERROR');
    this.name = 'PropertyError';
  }
}

/**
 * Error thrown when an unsupported format or version is encountered
 */
export class UnsupportedFormatError extends UnpakError {
  constructor(format: string, version?: number) {
    super(`Unsupported format: ${format}${version ? ` version ${version}` : ''}`, 'UNSUPPORTED_FORMAT');
    this.name = 'UnsupportedFormatError';
  }
}