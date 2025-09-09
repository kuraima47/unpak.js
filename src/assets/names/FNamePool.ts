import { IFName, IFNamePool, FNameConstants } from './IFName';
import { logger } from '../../core/logging/Logger';

/**
 * Implementation of FName
 */
export class FName implements IFName {
  constructor(
    public readonly index: number,
    public readonly number: number,
    public readonly text: string
  ) {}

  get isNone(): boolean {
    return this.index === FNameConstants.NONE_INDEX;
  }

  toString(): string {
    if (this.number === 0) {
      return this.text;
    }
    return `${this.text}_${this.number}`;
  }

  equals(other: IFName): boolean {
    return this.index === other.index && this.number === other.number;
  }
}

/**
 * Simple implementation of the FName pool
 */
export class FNamePool implements IFNamePool {
  private names: string[] = [];
  private nameMap = new Map<string, number>();

  constructor() {
    // Initialize with "None" at index 0
    this.addString(FNameConstants.NONE_VALUE);
  }

  getString(index: number): string | null {
    if (index < 0 || index >= this.names.length) {
      return null;
    }
    return this.names[index];
  }

  addString(text: string): number {
    // Check if string already exists
    const existingIndex = this.nameMap.get(text);
    if (existingIndex !== undefined) {
      return existingIndex;
    }

    // Add new string
    const index = this.names.length;
    this.names.push(text);
    this.nameMap.set(text, index);
    
    logger.debug('Added name to pool', { text, index });
    return index;
  }

  getCount(): number {
    return this.names.length;
  }

  createFName(index: number, number: number = 0): IFName {
    const text = this.getString(index);
    if (text === null) {
      logger.warn('Invalid FName index', { index });
      return new FName(index, number, `<Invalid:${index}>`);
    }
    
    return new FName(index, number, text);
  }

  getFName(text: string, number: number = 0): IFName {
    const index = this.addString(text);
    return new FName(index, number, text);
  }

  clear(): void {
    this.names = [];
    this.nameMap.clear();
    // Re-initialize with "None"
    this.addString(FNameConstants.NONE_VALUE);
    logger.debug('Cleared FName pool');
  }

  /**
   * Load names from an array (typically from asset files)
   */
  loadNames(names: string[]): void {
    for (const name of names) {
      this.addString(name);
    }
    logger.info('Loaded names into pool', { count: names.length, totalNames: this.getCount() });
  }

  /**
   * Get statistics about the pool
   */
  getStats(): { nameCount: number; memoryUsage: number } {
    const memoryUsage = this.names.reduce((total, name) => total + name.length * 2, 0); // Rough estimate
    return {
      nameCount: this.names.length,
      memoryUsage
    };
  }
}