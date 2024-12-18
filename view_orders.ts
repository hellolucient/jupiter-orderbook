import { Connection, PublicKey } from '@solana/web3.js';

const TX_ID = '5JNHpbZHavScNZBbAJpLioqRSJerDBBUmnjpQZY9kvhLt4NpWjU2vmsF8aAQFf6dFvH7YjyAdvTrPeW3EJutyTF4';

async function getLimitOrderDetails() {
    try {
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        
        console.log('🔍 Fetching transaction data...');
        const tx = await connection.getTransaction(TX_ID, {
            maxSupportedTransactionVersion: 0
        });

        if (!tx?.meta?.innerInstructions) {
            console.log('❌ Transaction data not found');
            return;
        }

        // Look for the Jupiter Limit Order V2 instruction
        const instructions = tx.transaction.message.compiledInstructions;
        if (instructions && instructions.length > 1) {
            const orderInstruction = instructions[1];
            
            // Decode base64 instruction data
            const instructionData = Uint8Array.from(
                Buffer.from(orderInstruction.data, 'base64')
            );
            
            // Create a DataView to read the values
            const view = new DataView(instructionData.buffer);
            
            // Skip 8 bytes discriminator
            const makingAmount = view.getBigUint64(16, true);  // true for little-endian
            const takingAmount = view.getBigUint64(24, true);
            const expiredAt = view.getBigUint64(32, true);
            
            console.log('\n💎 Order Details:');
            console.log(`Making Amount: ${Number(makingAmount) / 1e9} CHAOS`);
            console.log(`Taking Amount: ${Number(takingAmount) / 1e6} USDC`);
            console.log(`Price per token: $${(Number(takingAmount) / 1e6) / (Number(makingAmount) / 1e9)} USDC`);
            
            // Handle expiration
            if (expiredAt === 0n) {
                console.log('Expiry: Good till cancelled');
            } else {
                const expiryDate = new Date(Number(expiredAt) * 1000);
                console.log(`Expiry: ${expiryDate.toLocaleString()}`);
            }
            
            // Check if order is still active
            const orderAccount = new PublicKey('5fbgcXuNQwZ9EV9bYcsJwNUAd44Zxncftm9YGaNP4hnF');
            const accountInfo = await connection.getAccountInfo(orderAccount);
            console.log(`Status: ${accountInfo ? '🟢 Active' : '🔴 Filled/Cancelled'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        if (error instanceof Error) {
            console.error('Details:', error.message);
        }
    }
}

console.log('🔍 Looking up limit order details from transaction...');
getLimitOrderDetails();