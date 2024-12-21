import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { TOKENS } from './tokenConfig';

const testRawData = '86addfb94d561c33e9487d8c92d76a9338164751b67ed2fc2a6f89ca000c733d37087931e81d951f6e95da90dd11b7d7b9a59627513fd064b5facc54b56aebfd9679548aaa7f03afc6fa7af3bedbad3a3d65f36aabc97431b1bbe4c2d2f6e0e47ca60203452f5d6106ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a906ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a9bd101339e219e9a1cb98b4240d968eeb977e0f98f937215dc2e3f82226001d7bce6f060000000000e3e3312600000000e94f8e1e00000000e3e3312600000000e94f8e1e000000000000000000000000000a008b7da769b2decca0181c5fd34a390fbf3493e2a0fbb177131359496b928d84f9db935c6700000000db935c6700000000ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

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
displayU64Field('uniqueId', buffer.slice(200, 208));
displayU64Field('oriMakingAmount', buffer.slice(208, 216), { 
    isTokenAmount: true,
    useOutputMint: false
});
displayU64Field('oriTakingAmount', buffer.slice(216, 224), {
    isTokenAmount: true,
    useOutputMint: true
});
displayU64Field('makingAmount', buffer.slice(224, 232), {
    isTokenAmount: true,
    useOutputMint: false
});
displayU64Field('takingAmount', buffer.slice(232, 240), {
    isTokenAmount: true,
    useOutputMint: true
});
displayU64Field('borrowMakingAmount', buffer.slice(240, 248), {
    isTokenAmount: true,
    useOutputMint: false
});

// Check expiredAt's discriminator and adjust subsequent field positions
const expiredAtDiscriminator = buffer[248];
const expiredAtLength = expiredAtDiscriminator === 1 ? 9 : 1;  // 9 bytes if Some, 1 byte if None

// Slice expiredAt based on its actual length
const expiredAtSlice = buffer.slice(248, 248 + expiredAtLength);
displayOptionI64Field('expiredAt', expiredAtSlice);

// Adjust subsequent field positions based on expiredAt length
const feeBpsStart = 248 + expiredAtLength;
displayU16Field('feeBps', buffer.slice(feeBpsStart, feeBpsStart + 2));

const feeAccountStart = feeBpsStart + 2;
displayField('feeAccount', buffer.slice(feeAccountStart, feeAccountStart + 32));

const createdAtStart = feeAccountStart + 32;
displayI64Field('createdAt', buffer.slice(createdAtStart, createdAtStart + 8));

const updatedAtStart = createdAtStart + 8;
displayI64Field('updatedAt', buffer.slice(updatedAtStart, updatedAtStart + 8));

const bumpStart = updatedAtStart + 8;
displayU8Field('bump', buffer.slice(bumpStart, bumpStart + 1));