/**
 * Example usage of unpak.js v2.0 alpha
 * This demonstrates the basic functionality currently available
 */

import { 
  createKeyManager, 
  LogLevel, 
  logger,
  FNamePool,
  compressionRegistry,
  COMPRESSION_METHODS,
  BufferReader
} from '../src/index';

async function main() {
  // Configure logging to see what's happening
  logger.setLevel(LogLevel.INFO);
  logger.info('Starting unpak.js v2.0 example');

  // Example 1: Working with FName pool
  console.log('\n=== FName Pool Example ===');
  const namePool = new FNamePool();
  
  // Add some names
  namePool.loadNames(['MyAsset', 'Engine', 'Content', 'BasicShapes']);
  
  // Create FName objects
  const assetName = namePool.getFName('MyAsset', 0);
  const assetNameWithNumber = namePool.getFName('MyAsset', 5);
  
  console.log(`Asset name: ${assetName.toString()}`);
  console.log(`Asset name with number: ${assetNameWithNumber.toString()}`);
  console.log(`Pool statistics:`, namePool.getStats());

  // Example 2: Working with keys
  console.log('\n=== Key Management Example ===');
  const keyManager = createKeyManager();
  
  // Submit a test key (this is just for demonstration)
  const testGuid = '12345678-1234-1234-1234-123456789ABC';
  const testKey = '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
  
  await keyManager.submitKey(testGuid, testKey);
  console.log('Key submitted successfully');
  
  // Retrieve the key
  const retrievedKey = await keyManager.getKey(testGuid);
  console.log(`Key retrieved: ${retrievedKey ? 'Yes' : 'No'}`);
  console.log('Key manager stats:', keyManager.getStats());

  // Example 3: Binary data reading
  console.log('\n=== Binary Reading Example ===');
  
  // Create some test binary data
  const testBuffer = Buffer.alloc(20);
  testBuffer.writeUInt32LE(0x12345678, 0);
  testBuffer.writeFloatLE(3.14159, 4);
  testBuffer.write('Hello', 8, 'utf8');
  
  const reader = new BufferReader(testBuffer);
  console.log(`Buffer size: ${reader.size} bytes`);
  console.log(`Read uint32: 0x${reader.readUInt32().toString(16)}`);
  console.log(`Read float: ${reader.readFloat32()}`);
  console.log(`Read string: ${reader.readString(5)}`);

  // Example 4: Compression system
  console.log('\n=== Compression System Example ===');
  
  const supportedMethods = compressionRegistry.getSupportedMethods();
  console.log('Supported compression methods:', supportedMethods);
  
  // Test with uncompressed data
  const originalData = Buffer.from('This is test data for compression example');
  const uncompressedResult = await compressionRegistry.decompress(originalData, COMPRESSION_METHODS.NONE);
  console.log(`Original data: ${originalData.toString()}`);
  console.log(`Uncompressed result: ${uncompressedResult.toString()}`);
  console.log(`Data unchanged: ${Buffer.compare(originalData, uncompressedResult) === 0}`);

  // Example 5: Error handling
  console.log('\n=== Error Handling Example ===');
  try {
    // Try to get a non-existent key
    const missingKey = await keyManager.getKey('non-existent-guid');
    console.log(`Missing key result: ${missingKey}`);
  } catch (error) {
    console.log(`Error handling works: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    // Try unsupported compression
    await compressionRegistry.decompress(Buffer.from('test'), 'unsupported-method');
  } catch (error) {
    console.log(`Compression error caught: ${error instanceof Error ? error.name : 'Unknown'}`);
  }

  console.log('\n=== Example Complete ===');
  console.log('unpak.js v2.0 basic functionality demonstrated!');
}

// Run the example
main().catch(error => {
  console.error('Example failed:', error);
  process.exit(1);
});