import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=3632daae-4968-4896-9d0d-43f382188194');
const jupiterLimitOrderProgramId = new PublicKey('j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X');
const CHAOS_MINT = new PublicKey('8SgNwESovnbG1oNEaPVhg6CR9mTMSK7jPvcYRe3wpump');

interface OrderInfo {
  orderAccount: string;
  maker: string;
  inputMint: string;
  outputMint: string;
  isBuyOrder: boolean;
}

async function findAllChaosOrders() {
  try {
    console.log('Looking for all CHAOS orders...');
    console.log('CHAOS Token Address:', CHAOS_MINT.toString());
    
    // Find sell orders (CHAOS as input)
    const sellOrders = await connection.getProgramAccounts(jupiterLimitOrderProgramId, {
      commitment: 'confirmed',
      filters: [
        { dataSize: 372 },
        {
          memcmp: {
            offset: 40,
            bytes: CHAOS_MINT.toBase58()
          }
        }
      ]
    });

    // Find buy orders (CHAOS as output)
    const buyOrders = await connection.getProgramAccounts(jupiterLimitOrderProgramId, {
      commitment: 'confirmed',
      filters: [
        { dataSize: 372 },
        {
          memcmp: {
            offset: 72,
            bytes: CHAOS_MINT.toBase58()
          }
        }
      ]
    });

    // Add initial summary
    console.log('\n=== ORDER SUMMARY ===');
    console.log(`Found ${buyOrders.length} buy orders and ${sellOrders.length} sell orders`);
    console.log('----------------------------------------');
    
    // Process sell orders
    console.log('\n=== SELL ORDERS ===');
    const sellOrdersInfo = sellOrders.map(account => {
      const data = account.account.data;
      return {
        orderAccount: account.pubkey.toString(),
        maker: new PublicKey(data.slice(8, 40)).toString(),
        inputMint: new PublicKey(data.slice(40, 72)).toString(),
        outputMint: new PublicKey(data.slice(72, 104)).toString(),
        isBuyOrder: false
      } as OrderInfo;
    });

    sellOrdersInfo.forEach(order => {
      console.log('\n----------------------------------------');
      console.log('Order:', order.orderAccount);
      console.log('Maker:', order.maker);
      console.log('Input Token (CHAOS):', order.inputMint);
      console.log('Output Token:', order.outputMint);
      console.log('----------------------------------------');
    });

    // Process buy orders
    console.log('\n=== BUY ORDERS ===');
    const buyOrdersInfo = buyOrders.map(account => {
      const data = account.account.data;
      return {
        orderAccount: account.pubkey.toString(),
        maker: new PublicKey(data.slice(8, 40)).toString(),
        inputMint: new PublicKey(data.slice(40, 72)).toString(),
        outputMint: new PublicKey(data.slice(72, 104)).toString(),
        isBuyOrder: true
      } as OrderInfo;
    });

    buyOrdersInfo.forEach(order => {
      console.log('\n----------------------------------------');
      console.log('Order:', order.orderAccount);
      console.log('Maker:', order.maker);
      console.log('Input Token:', order.inputMint);
      console.log('Output Token (CHAOS):', order.outputMint);
      console.log('----------------------------------------');
    });

    // Add final summary
    console.log('\n=== FINAL SUMMARY ===');
    console.log(`Total Orders: ${buyOrders.length + sellOrders.length}`);
    console.log(`Buy Orders: ${buyOrders.length}`);
    console.log(`Sell Orders: ${sellOrders.length}`);
    console.log('----------------------------------------');

    return [...buyOrdersInfo, ...sellOrdersInfo];

  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

findAllChaosOrders();