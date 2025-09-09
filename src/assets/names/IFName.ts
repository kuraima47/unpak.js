/**
 * FName represents a name in Unreal Engine's name pool system
 * Names are stored as indices into a global name table for efficiency
 */
export interface IFName {
  /** Index into the name pool */
  readonly index: number;
  
  /** Instance number for handling duplicates */
  readonly number: number;
  
  /** Resolved string value */
  readonly text: string;
  
  /** Whether this is a "None" name */
  readonly isNone: boolean;
}

/**
 * Interface for the FName pool system
 */
export interface IFNamePool {
  /**
   * Get the string for a given name index
   */
  getString(index: number): string | null;
  
  /**
   * Add a string to the pool and return its index
   */
  addString(text: string): number;
  
  /**
   * Get the total number of names in the pool
   */
  getCount(): number;
  
  /**
   * Create an FName from index and number
   */
  createFName(index: number, number?: number): IFName;
  
  /**
   * Find or create an FName from a string
   */
  getFName(text: string, number?: number): IFName;
  
  /**
   * Clear the pool
   */
  clear(): void;
}

/**
 * Constants for special FName values
 */
export const FNameConstants = {
  /** Index of the "None" name */
  NONE_INDEX: 0,
  
  /** The "None" string value */
  NONE_VALUE: 'None',
} as const;