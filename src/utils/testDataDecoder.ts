import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { TOKENS } from './tokenConfig';

const testRawData = '86addfb94d561c33b4648db8ab29220ffeb677d7192f1d2d4f7c9a19fae57fc394f25e8a661db27d6e95da90dd11b7d7b9a59627513fd064b5facc54b56aebfd9679548aaa7f03af069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001';

function decodeFields() {
    console.log('=== Decoding Fields ===\n');
    
    // Convert our raw data to a buffer first
    const rawData = Buffer.from(testRawData, 'hex');
    
    // Decode addresses using PublicKey
    const maker = new PublicKey(rawData.slice(8, 40)).toString();
    const inputMint = new PublicKey(rawData.slice(40, 72)).toString();
    const outputMint = new PublicKey(rawData.slice(72, 104)).toString();
    
    // Create DataView for reading u64 values
    const dataView = new DataView(rawData.buffer);
    
    // Read amounts (u64) at correct offsets
    const makingAmount = dataView.getBigUint64(216, true);  // true for little-endian
    const takingAmount = dataView.getBigUint64(224, true);
    const expiredAt = dataView.getBigUint64(144, true);
    
    console.log('Addresses:');
    console.log('Maker:', maker);
    console.log('Input Mint:', inputMint);
    console.log('Output Mint:', outputMint);
    
    console.log('\nAmounts:');
    console.log('Making Amount:', Number(makingAmount) / 1e6, 'CHAOS');  // CHAOS has 6 decimals
    console.log('Taking Amount:', Number(takingAmount) / 1e9, 'SOL');    // SOL has 9 decimals
    console.log('Price per token:', (Number(takingAmount) / 1e9) / (Number(makingAmount) / 1e6), 'SOL');
    
    // Handle expiration
    if (expiredAt === 0n) {
        console.log('Expiry: Good till cancelled');
    } else {
        console.log('Expiry:', new Date(Number(expiredAt) * 1000).toLocaleString());
    }
}

decodeFields(); 