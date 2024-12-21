# Jupiter Order Data Structure & Processing

## Files
- `src/utils/bufferTest2.ts` - Main decoder with correct field ordering
- `src/utils/bufferTest.ts` - Original test file (reference)
- `src/utils/testDataDecoder.ts` - Simple decoder for quick tests

## Data Structures

// Header
{"name":"header","type":"bytes"},                  // 8 bytes / 16 hex

// PublicKey Fields
{"name":"maker","type":"publicKey"},               // 32 bytes / 64 hex
{"name":"inputMint","type":"publicKey"},           // 32 bytes / 64 hex
{"name":"outputMint","type":"publicKey"},          // 32 bytes / 64 hex
{"name":"inputTokenProgram","type":"publicKey"},   // 32 bytes / 64 hex
{"name":"outputTokenProgram","type":"publicKey"},  // 32 bytes / 64 hex
{"name":"inputMintReserve","type":"publicKey"},    // 32 bytes / 64 hex

// u64 Fields
{"name":"uniqueId","type":"u64"},                  // 8 bytes / 16 hex
{"name":"oriMakingAmount","type":"u64"},           // 8 bytes / 16 hex
{"name":"oriTakingAmount","type":"u64"},           // 8 bytes / 16 hex
{"name":"makingAmount","type":"u64"},              // 8 bytes / 16 hex
{"name":"takingAmount","type":"u64"},              // 8 bytes / 16 hex
{"name":"borrowMakingAmount","type":"u64"},        // 8 bytes / 16 hex

// Option Field
{"name":"expiredAt","type":{"option":"i64"}},      // 9 bytes / 18 hex (1 discriminator + 8 timestamp)

// u16 Field
{"name":"feeBps","type":"u16"},                    // 2 bytes / 4 hex

// PublicKey Field
{"name":"feeAccount","type":"publicKey"},          // 32 bytes / 64 hex

// i64 Fields
{"name":"createdAt","type":"i64"},                 // 8 bytes / 16 hex
{"name":"updatedAt","type":"i64"},                 // 8 bytes / 16 hex

// u8 Field
{"name":"bump","type":"u8"},                       // 1 byte / 2 hex

## Raw Data Processing

### 1. Data Input & Conversion

typescript
// Raw hex string input
const testRawData = '86addfb94d561c3348185413...';
// Convert to Buffer for byte operations
const buffer = Buffer.from(testRawData, 'hex');


### 2. Buffer Slicing & Field Extraction

typescript
// Helper function for consistent formatting
function formatSlice(slice: Buffer) {
return {
hex: slice.toString('hex'),
bytes: [...slice].map(b => b.toString(16).padStart(2, '0')).join(' '),
numbers: [...slice].join(', ')
};
}
// Field extraction examples
const makerSlice = buffer.slice(8, 40);
const inputMintSlice = buffer.slice(40, 72);
// ... etc


### 3. Field Type Handlers

typescript
// PublicKey Handler
function displayField(name: string, slice: Buffer) {
const format = formatSlice(slice);
console.log(${name} as hex: ${format.hex});
console.log(${name} as bytes: ${format.bytes});
console.log(${name} as numbers: ${format.numbers});
console.log(${name} address: ${new PublicKey(slice).toString()}\n);
}
// u64 Handler
function displayU64Field(name: string, slice: Buffer) {
const view = new DataView(slice.buffer, slice.byteOffset, slice.length);
const rawValue = view.getBigUint64(0, true); // true for little-endian
// Handle token amounts if needed
if (options.isTokenAmount) {
const actualAmount = Number(rawValue) / Math.pow(10, decimals);
}
}
// Option<i64> Handler
function displayOptionI64Field(name: string, slice: Buffer) {
const hasValue = slice[0] === 1;
if (hasValue) {
const view = new DataView(slice.buffer, slice.byteOffset + 1, 8);
const timestamp = Number(view.getBigInt64(0, true));
console.log(${name} as date: ${new Date(timestamp * 1000).toLocaleString()});
}
}


## Running the Scripts

bash
Full analysis with detailed field breakdown
npx ts-node src/utils/bufferTest2.ts
Quick verification of key fields
npx ts-node src/utils/testDataDecoder.ts
Reference implementation
npx ts-node src/utils/bufferTest.ts



## Notes
- All numeric values are little-endian
- Timestamps are Unix timestamps (seconds since epoch)
- PublicKey fields are always 32 bytes
- Option fields include a 1-byte discriminator
- Token amounts need decimal adjustment based on mint