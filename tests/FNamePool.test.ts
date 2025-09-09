import { FNamePool, FName } from '../src/assets/names/FNamePool';
import { FNameConstants } from '../src/assets/names/IFName';

describe('FNamePool', () => {
  let pool: FNamePool;

  beforeEach(() => {
    pool = new FNamePool();
  });

  describe('initialization', () => {
    it('should initialize with "None" at index 0', () => {
      expect(pool.getCount()).toBe(1);
      expect(pool.getString(0)).toBe('None');
    });

    it('should create "None" FName correctly', () => {
      const noneFName = pool.createFName(FNameConstants.NONE_INDEX);
      expect(noneFName.isNone).toBe(true);
      expect(noneFName.text).toBe('None');
      expect(noneFName.index).toBe(0);
      expect(noneFName.number).toBe(0);
    });
  });

  describe('string operations', () => {
    it('should add new strings and return correct index', () => {
      const index = pool.addString('TestString');
      expect(index).toBe(1); // After "None" at index 0
      expect(pool.getString(index)).toBe('TestString');
      expect(pool.getCount()).toBe(2);
    });

    it('should reuse existing strings', () => {
      const index1 = pool.addString('TestString');
      const index2 = pool.addString('TestString');
      expect(index1).toBe(index2);
      expect(pool.getCount()).toBe(2); // Should not add duplicate
    });

    it('should return null for invalid indices', () => {
      expect(pool.getString(-1)).toBeNull();
      expect(pool.getString(999)).toBeNull();
    });
  });

  describe('FName creation', () => {
    it('should create FName from valid index', () => {
      const testIndex = pool.addString('TestName');
      const fname = pool.createFName(testIndex, 5);
      
      expect(fname.index).toBe(testIndex);
      expect(fname.number).toBe(5);
      expect(fname.text).toBe('TestName');
      expect(fname.isNone).toBe(false);
    });

    it('should create FName from string', () => {
      const fname = pool.getFName('NewString', 3);
      
      expect(fname.text).toBe('NewString');
      expect(fname.number).toBe(3);
      expect(fname.isNone).toBe(false);
      expect(pool.getString(fname.index)).toBe('NewString');
    });

    it('should handle invalid index gracefully', () => {
      const fname = pool.createFName(999);
      expect(fname.text).toContain('<Invalid:999>');
      expect(fname.index).toBe(999);
    });
  });

  describe('bulk operations', () => {
    it('should load multiple names correctly', () => {
      const names = ['Name1', 'Name2', 'Name3'];
      pool.loadNames(names);
      
      expect(pool.getCount()).toBe(4); // 3 new + "None"
      expect(pool.getString(1)).toBe('Name1');
      expect(pool.getString(2)).toBe('Name2');
      expect(pool.getString(3)).toBe('Name3');
    });

    it('should clear and reinitialize correctly', () => {
      pool.addString('TestString');
      expect(pool.getCount()).toBe(2);
      
      pool.clear();
      expect(pool.getCount()).toBe(1);
      expect(pool.getString(0)).toBe('None');
    });
  });

  describe('statistics', () => {
    it('should provide accurate stats', () => {
      pool.addString('Short');
      pool.addString('LongerString');
      
      const stats = pool.getStats();
      expect(stats.nameCount).toBe(3); // "None" + 2 added
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });
});

describe('FName', () => {
  describe('string representation', () => {
    it('should format without number suffix when number is 0', () => {
      const fname = new FName(1, 0, 'TestName');
      expect(fname.toString()).toBe('TestName');
    });

    it('should format with number suffix when number > 0', () => {
      const fname = new FName(1, 5, 'TestName');
      expect(fname.toString()).toBe('TestName_5');
    });
  });

  describe('equality', () => {
    it('should consider FNames equal when index and number match', () => {
      const fname1 = new FName(1, 5, 'Test');
      const fname2 = new FName(1, 5, 'Test'); // Same values
      expect(fname1.equals(fname2)).toBe(true);
    });

    it('should consider FNames different when index differs', () => {
      const fname1 = new FName(1, 5, 'Test');
      const fname2 = new FName(2, 5, 'Test');
      expect(fname1.equals(fname2)).toBe(false);
    });

    it('should consider FNames different when number differs', () => {
      const fname1 = new FName(1, 5, 'Test');
      const fname2 = new FName(1, 6, 'Test');
      expect(fname1.equals(fname2)).toBe(false);
    });
  });

  describe('None detection', () => {
    it('should detect None correctly', () => {
      const noneFName = new FName(FNameConstants.NONE_INDEX, 0, FNameConstants.NONE_VALUE);
      expect(noneFName.isNone).toBe(true);
    });

    it('should not detect non-None as None', () => {
      const regularFName = new FName(1, 0, 'Regular');
      expect(regularFName.isNone).toBe(false);
    });
  });
});