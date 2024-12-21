import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { TOKENS } from './tokenConfig';

const testRawData = '86addfb94d561c33b4648db8ab29220ffeb677d7192f1d2d4f7c9a19fae57fc394f25e8a661db27d6e95da90dd11b7d7b9a59627513fd064b5facc54b56aebfd9679548aaa7f03af069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f0000000000106ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a906ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a9f8c371bb1723fbb8a624b3c1a10a042ef4ed1d70c98f2814e6df930c8d1c6696551f010000000000718bfb3600000000b9c57d1b00000000718bfb3600000000b9c57d1b000000000000000000000000000a00e45d17524e46de4a31338360568984b0523871d55e0ce4e739b0e62b0267307233825e670000000033825e6700000000fb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

console.log('=== Detailed Buffer Analysis ===\n');

// Convert entire data to buffer (including header)
const buffer = Buffer.from(testRawData, 'hex');

// Function to format a buffer slice
function formatSlice(slice: Buffer) {
    return {
        hex: slice.toString('hex'),
        bytes: [...slice].map(b => b.toString(16).padStart(2, '0')).join(' '),
        numbers: [...slice].join(', ')
    };
}

// Function to display PublicKey field details
function displayField(name: string, slice: Buffer) {
    const format = formatSlice(slice);
    console.log(`{"name":"${name}","type":"publicKey"},          // 32 bytes`);
    console.log(`${name} as hex: ${format.hex}`);
    console.log(`${name} as bytes: ${format.bytes}`);
    console.log(`${name} as numbers: ${format.numbers}`);
    console.log(`${name} address: ${new PublicKey(slice).toString()}\n`);
}

// Function to display u64 field details
function displayU64Field(name: string, slice: Buffer, options: {
    isTokenAmount?: boolean,    // If true, convert using token decimals
    useOutputMint?: boolean     // If true, use outputMint decimals, else inputMint
} = {}) {
    const format = formatSlice(slice);
    console.log(`{"name":"${name}","type":"u64"},          // 8 bytes`);
    console.log(`${name} as hex: ${format.hex}`);
    console.log(`${name} as bytes: ${format.bytes}`);
    console.log(`${name} as numbers: ${format.numbers}`);
    
    const view = new DataView(slice.buffer, slice.byteOffset, slice.length);
    const rawValue = view.getBigUint64(0, true);
    console.log(`${name} raw value: ${rawValue}`);
    
    // Handle token amounts - applies to: oriMakingAmount, oriTakingAmount, makingAmount, takingAmount
    if (options.isTokenAmount) {
        const mintSlice = options.useOutputMint ? buffer.slice(72, 104) : buffer.slice(40, 72);
        const mintAddress = new PublicKey(mintSlice).toString();
        
        let decimals = 6; // default
        if (mintAddress === TOKENS.CHAOS.address) {
            decimals = TOKENS.CHAOS.decimals;
        } else if (mintAddress === TOKENS.SOL.address) {
            decimals = TOKENS.SOL.decimals;
        } else if (mintAddress === TOKENS.USDC.address) {
            decimals = TOKENS.USDC.decimals;
        }
        
        const actualAmount = Number(rawValue) / Math.pow(10, decimals);
        console.log(`${name} actual token amount: ${actualAmount}`);
    }
    console.log();
}

// Function to display option<i64> field details
function displayOptionI64Field(name: string, slice: Buffer) {
    const format = formatSlice(slice);
    console.log(`{"name":"${name}","type":{"option":"i64"}},    // 9 bytes (option)`);
    console.log(`${name} as hex: ${format.hex}`);
    console.log(`${name} as bytes: ${format.bytes}`);
    console.log(`${name} as numbers: ${format.numbers}`);
    
    // First byte is the discriminator (0 = None, 1 = Some)
    const hasValue = slice[0] === 1;
    if (hasValue) {
        const view = new DataView(slice.buffer, slice.byteOffset + 1, 8);  // Skip first byte
        const timestamp = Number(view.getBigInt64(0, true));
        console.log(`${name} value: ${timestamp}`);
        console.log(`${name} as date: ${new Date(timestamp * 1000).toLocaleString()}`);
    } else {
        console.log(`${name} value: None (no expiry)`);
    }
    console.log();
}

// Function to display u16 field details
function displayU16Field(name: string, slice: Buffer) {
    const format = formatSlice(slice);
    console.log(`{"name":"${name}","type":"u16"},          // 2 bytes`);
    console.log(`${name} as hex: ${format.hex}`);
    console.log(`${name} as bytes: ${format.bytes}`);
    console.log(`${name} as numbers: ${format.numbers}`);
    
    // Direct byte reading - first byte is LSB in little-endian
    const value = slice[0] + (slice[1] << 8);
    console.log(`${name} value: ${value}`);
    console.log();
}

// Function to display i64 field details
function displayI64Field(name: string, slice: Buffer) {
    const format = formatSlice(slice);
    console.log(`{"name":"${name}","type":"i64"},          // 8 bytes`);
    console.log(`${name} as hex: ${format.hex}`);
    console.log(`${name} as bytes: ${format.bytes}`);
    console.log(`${name} as numbers: ${format.numbers}`);
    
    const view = new DataView(slice.buffer, slice.byteOffset, slice.length);
    const timestamp = Number(view.getBigInt64(0, true));
    console.log(`${name} value: ${timestamp}`);
    console.log(`${name} as date: ${new Date(timestamp * 1000).toLocaleString()}`);
    console.log();
}

// Function to display u8 field details
function displayU8Field(name: string, slice: Buffer) {
    const format = formatSlice(slice);
    console.log(`{"name":"${name}","type":"u8"},          // 1 byte`);
    console.log(`${name} as hex: ${format.hex}`);
    console.log(`${name} as bytes: ${format.bytes}`);
    console.log(`${name} as numbers: ${format.numbers}`);
    console.log(`${name} value: ${slice[0]}`);
    console.log();
}

// Display fields with clear type annotations
// PublicKey fields (32 bytes each)
displayField('maker', buffer.slice(8, 40));
displayField('inputMint', buffer.slice(40, 72));
displayField('outputMint', buffer.slice(72, 104));
displayField('inputTokenProgram', buffer.slice(104, 136));
displayField('outputTokenProgram', buffer.slice(136, 168));
displayField('inputMintReserve', buffer.slice(168, 200));

// u64 fields (8 bytes each)
displayU64Field('uniqueId', buffer.slice(200, 208));  // Regular number, no decimals
displayU64Field('oriMakingAmount', buffer.slice(208, 216), { 
    isTokenAmount: true,        // Needs token decimals
    useOutputMint: false        // Uses inputMint decimals
});
displayU64Field('oriTakingAmount', buffer.slice(216, 224), {
    isTokenAmount: true,        // Needs token decimals
    useOutputMint: true         // Uses outputMint decimals
});
displayU64Field('makingAmount', buffer.slice(224, 232), {
    isTokenAmount: true,        // Needs token decimals
    useOutputMint: false        // Uses inputMint decimals
});
displayU64Field('takingAmount', buffer.slice(232, 240), {
    isTokenAmount: true,        // Needs token decimals
    useOutputMint: true         // Uses outputMint decimals
});
displayU64Field('borrowMakingAmount', buffer.slice(240, 248), {
    isTokenAmount: true,        // Needs token decimals
    useOutputMint: false        // Uses inputMint decimals
});

// u16 fields (2 bytes each) - Moved before expiredAt
displayU16Field('feeBps', buffer.slice(248, 250));

// option<i64> fields (9 bytes each)
displayOptionI64Field('expiredAt', buffer.slice(250, 259));

// PublicKey fields (32 bytes)
displayField('feeAccount', buffer.slice(251, 283));  // Updated position for feeAccount

// i64 fields (8 bytes each)
displayI64Field('createdAt', buffer.slice(283, 291));    // First 33825e6700000000
displayI64Field('updatedAt', buffer.slice(291, 299));    // Second 33825e6700000000

// u8 fields (1 byte each)
displayU8Field('bump', buffer.slice(299, 300));          // fb