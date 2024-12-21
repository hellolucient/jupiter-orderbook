import { Connection, PublicKey } from '@solana/web3.js';
import { TOKENS } from './utils/tokenConfig';
import * as fs from 'fs';

// Initialize connection
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=3632daae-4968-4896-9d0d-43f382188194');
const jupiterLimitOrderProgramId = new PublicKey('j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X');

// Token addresses
const CHAOS_MINT = new PublicKey(TOKENS.CHAOS.address);
const LOGOS_MINT = new PublicKey(TOKENS.LOGOS.address);

interface OrderData {
    orderAccount: string;  // The order number/ID
    rawData: string;      // Raw hex data
    isSellOrder: boolean; // Whether it's a sell order
}

async function findTokenOrders(tokenMint: PublicKey, tokenName: string): Promise<OrderData[]> {
    console.log(`\nFetching ${tokenName} orders...`);
    
    // Find all orders (both buy and sell) for the token
    const [sellOrders, buyOrders] = await Promise.all([
        connection.getProgramAccounts(jupiterLimitOrderProgramId, {
            commitment: 'confirmed',
            filters: [
                { dataSize: 372 },
                { memcmp: { offset: 40, bytes: tokenMint.toBase58() }}
            ]
        }),
        connection.getProgramAccounts(jupiterLimitOrderProgramId, {
            commitment: 'confirmed',
            filters: [
                { dataSize: 372 },
                { memcmp: { offset: 72, bytes: tokenMint.toBase58() }}
            ]
        })
    ]);

    console.log(`${tokenName} Sell Orders: ${sellOrders.length}`);
    console.log(`${tokenName} Buy Orders: ${buyOrders.length}`);

    // Modify the orders creation to include isSellOrder
    const orderSet = new Set();
    const orders = [
        ...sellOrders.map(account => ({
            orderAccount: account.pubkey.toString(),
            rawData: Buffer.from(account.account.data).toString('hex'),
            isSellOrder: true
        })),
        ...buyOrders.map(account => ({
            orderAccount: account.pubkey.toString(),
            rawData: Buffer.from(account.account.data).toString('hex'),
            isSellOrder: false
        }))
    ].filter(account => {
        if (orderSet.has(account.orderAccount)) {
            console.log(`Duplicate order found: ${account.orderAccount}`);
            return false;
        }
        orderSet.add(account.orderAccount);
        return true;
    });

    console.log(`Found ${orders.length} unique orders for ${tokenName}`);
    return orders;
}

async function main() {
    try {
        // Create write stream for output file
        const outputFile = 'orderData.txt';
        if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile);
        }
        const writeStream = fs.createWriteStream(outputFile);
        
        // Helper function to write to both console and file
        const log = (message: string) => {
            console.log(message);
            writeStream.write(message + '\n');
        };

        // Fetch orders for both tokens
        const [chaosOrders, logosOrders] = await Promise.all([
            findTokenOrders(CHAOS_MINT, 'CHAOS'),
            findTokenOrders(LOGOS_MINT, 'LOGOS')
        ]);

        // Print summary with clear separation
        log('\n==========================================');
        log('           ORDER SUMMARY');
        log('==========================================');
        log(`CHAOS:`);
        log(`  Sell Orders: ${chaosOrders.filter(o => o.isSellOrder).length}`);
        log(`  Buy Orders: ${chaosOrders.filter(o => !o.isSellOrder).length}`);
        log(`  Total Orders: ${chaosOrders.length}`);
        log('\nLOGOS:');
        log(`  Sell Orders: ${logosOrders.filter(o => o.isSellOrder).length}`);
        log(`  Buy Orders: ${logosOrders.filter(o => !o.isSellOrder).length}`);
        log(`  Total Orders: ${logosOrders.length}`);
        log(`\nTOTAL ORDERS: ${chaosOrders.length + logosOrders.length}`);
        log('==========================================\n');

        // Print order details
        log('\n==========================================');
        log('           DETAILED ORDER DATA');
        log('==========================================');
        
        log('\n=== CHAOS ORDERS ===');
        chaosOrders.forEach((order, index) => {
            log(`\nOrder #${index + 1}:`);
            log('Account: ' + order.orderAccount);
            log('Type: ' + (order.isSellOrder ? 'Sell' : 'Buy'));
            log('Raw Data: ' + order.rawData);
            log('----------------------------------------');
        });

        log('\n=== LOGOS ORDERS ===');
        logosOrders.forEach((order, index) => {
            log(`\nOrder #${index + 1}:`);
            log('Account: ' + order.orderAccount);
            log('Type: ' + (order.isSellOrder ? 'Sell' : 'Buy'));
            log('Raw Data: ' + order.rawData);
            log('----------------------------------------');
        });

        // Close the write stream
        writeStream.end();
        console.log(`\nOutput written to ${outputFile}`);

        return [...chaosOrders, ...logosOrders];
    } catch (error) {
        console.error('Error fetching orders:', error);
        process.exit(1);
    }
}

// Execute
main(); 