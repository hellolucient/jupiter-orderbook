import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { getTokenDecimals, TOKENS } from './utils/tokenConfig';
import * as fs from 'fs';

// Clear terminal and add some process management
process.stdout.write('\x1Bc');
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=3632daae-4968-4896-9d0d-43f382188194');
const jupiterLimitOrderProgramId = new PublicKey('j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X');
const CHAOS_MINT = new PublicKey(TOKENS.CHAOS.address);
const LOGOS_MINT = new PublicKey(TOKENS.LOGOS.address);

interface TokenDecimalInfo {
  decimals: number;
  isKnown: boolean;
}

type OrderStatus = 'active' | 'active_partial' | 'expired_partial';

interface OrderInfo {
  orderAccount: string;
  maker: string;
  inputMint: string;
  outputMint: string;
  isBuyOrder: boolean;
  oriMakingAmount: bigint;
  oriTakingAmount: bigint;
  makingAmount: bigint;
  takingAmount: bigint;
  expiryTime: number;
  tokenName: string;
  inputDecimals: TokenDecimalInfo;
  outputDecimals: TokenDecimalInfo;
  fillStatus: {
    isPartiallyFilled: boolean;
    percentageFilled: number;
    remainingAmount: number;
  };
  orderStatus: OrderStatus;
}

function getUint64(dataView: DataView, offset: number): bigint {
  const left = dataView.getUint32(offset, true);
  const right = dataView.getUint32(offset + 4, true);
  return BigInt(left) + (BigInt(right) << 32n);
}

function categorizeOrder(order: OrderInfo): void {
  // Add debug logging
  console.log('\nDEBUG - Order Analysis:', order.orderAccount);
  console.log('Original vs Current Amounts:', {
    oriMakingAmount: order.oriMakingAmount.toString(),
    makingAmount: order.makingAmount.toString(),
    difference: (order.oriMakingAmount - order.makingAmount).toString()
  });

  const isPartiallyFilled = order.makingAmount < order.oriMakingAmount;
  const percentageFilled = Number((order.oriMakingAmount - order.makingAmount) * 100n / order.oriMakingAmount);
  
  order.fillStatus = {
    isPartiallyFilled,
    percentageFilled,
    remainingAmount: Number(order.makingAmount)
  };
  
  // Set the order status
  if (isPartiallyFilled && order.expiryTime < Date.now()/1000) {
    order.orderStatus = 'expired_partial';
  } else if (isPartiallyFilled) {
    order.orderStatus = 'active_partial';
  } else {
    order.orderStatus = 'active';
  }
  
  // Add status debug logging
  console.log('Fill Status:', {
    isPartiallyFilled,
    percentageFilled,
    remainingAmount: order.fillStatus.remainingAmount,
    expiryTime: order.expiryTime ? new Date(order.expiryTime * 1000).toLocaleString() : 'None'
  });
  console.log('Order Status:', order.orderStatus);
}

async function findAllTokenOrders(
  tokenMint: PublicKey, 
  tokenName: string,
  log: (message: string) => void
) {
  try {
    log(`\nLooking for all ${tokenName} orders...`);
    log(`${tokenName} Token Address: ${tokenMint.toString()}`);
    
    // Find sell orders (token as input)
    const sellOrders = await connection.getProgramAccounts(jupiterLimitOrderProgramId, {
      commitment: 'confirmed',
      filters: [
        { dataSize: 372 },
        {
          memcmp: {
            offset: 40,
            bytes: tokenMint.toBase58()
          }
        }
      ]
    });

    // Find buy orders (token as output)
    const buyOrders = await connection.getProgramAccounts(jupiterLimitOrderProgramId, {
      commitment: 'confirmed',
      filters: [
        { dataSize: 372 },
        {
          memcmp: {
            offset: 72,
            bytes: tokenMint.toBase58()
          }
        }
      ]
    });

    // Add initial summary
    log('\n=== ORDER SUMMARY ===');
    log(`Found ${buyOrders.length} buy orders and ${sellOrders.length} sell orders for ${tokenName}`);
    log('----------------------------------------');
    
    // Process sell orders
    log(`\n=== ${tokenName} SELL ORDERS ===`);
    const sellOrdersInfo = sellOrders.map(account => {
      const data = account.account.data;
      const buffer = Buffer.from(data);
      const dataView = new DataView(data.buffer);
      
      // Check expiredAt's discriminator and adjust field positions
      const expiredAtDiscriminator = buffer[248];
      const expiredAtLength = expiredAtDiscriminator === 1 ? 9 : 1;
      const feeBpsStart = 248 + expiredAtLength;
      
      const order = {
        orderAccount: account.pubkey.toString(),
        maker: new PublicKey(data.slice(24, 56)).toString(),
        inputMint: new PublicKey(data.slice(56, 88)).toString(),
        outputMint: new PublicKey(data.slice(88, 120)).toString(),
        oriMakingAmount: getUint64(dataView, 208),
        oriTakingAmount: getUint64(dataView, 216),
        makingAmount: getUint64(dataView, 224),
        takingAmount: getUint64(dataView, 232),
        expiryTime: expiredAtDiscriminator === 1 ? 
          Number(dataView.getBigInt64(249, true)) : 0,
        isBuyOrder: false,
        tokenName,
        inputDecimals: getTokenDecimals(new PublicKey(data.slice(56, 88)).toString()),
        outputDecimals: getTokenDecimals(new PublicKey(data.slice(88, 120)).toString()),
        fillStatus: { isPartiallyFilled: false, percentageFilled: 0, remainingAmount: 0 },
        orderStatus: 'active' as OrderStatus
      };
      
      categorizeOrder(order);
      return order;
    });

    // Process buy orders (similar to sell orders)
    const buyOrdersInfo = buyOrders.map(account => {
      const data = account.account.data;
      const buffer = Buffer.from(data);
      const dataView = new DataView(data.buffer);
      
      // Check expiredAt's discriminator and adjust field positions
      const expiredAtDiscriminator = buffer[248];
      const expiredAtLength = expiredAtDiscriminator === 1 ? 9 : 1;
      const feeBpsStart = 248 + expiredAtLength;
      
      const order = {
        orderAccount: account.pubkey.toString(),
        maker: new PublicKey(data.slice(24, 56)).toString(),
        inputMint: new PublicKey(data.slice(56, 88)).toString(),
        outputMint: new PublicKey(data.slice(88, 120)).toString(),
        oriMakingAmount: getUint64(dataView, 208),
        oriTakingAmount: getUint64(dataView, 216),
        makingAmount: getUint64(dataView, 224),
        takingAmount: getUint64(dataView, 232),
        expiryTime: expiredAtDiscriminator === 1 ? 
          Number(dataView.getBigInt64(249, true)) : 0,
        isBuyOrder: true,
        tokenName,
        inputDecimals: getTokenDecimals(new PublicKey(data.slice(56, 88)).toString()),
        outputDecimals: getTokenDecimals(new PublicKey(data.slice(88, 120)).toString()),
        fillStatus: { isPartiallyFilled: false, percentageFilled: 0, remainingAmount: 0 },
        orderStatus: 'active' as OrderStatus
      };
      
      categorizeOrder(order);
      return order;
    });

    // Group orders by status
    const activeOrders = sellOrdersInfo.filter(o => o.orderStatus === 'active');
    const partialOrders = sellOrdersInfo.filter(o => o.orderStatus === 'active_partial');
    const expiredPartialOrders = sellOrdersInfo.filter(o => o.orderStatus === 'expired_partial');

    // Log orders by category
    log('\n=== ACTIVE ORDERS ===');
    activeOrders.forEach(order => logOrderDetails(order, log));

    if (partialOrders.length > 0) {
      log('\n=== PARTIALLY FILLED ORDERS ===');
      partialOrders.forEach(order => logOrderDetails(order, log));
    }

    if (expiredPartialOrders.length > 0) {
      log('\n=== EXPIRED PARTIAL ORDERS ===');
      expiredPartialOrders.forEach(order => logOrderDetails(order, log));
    }

    // Similar process for buy orders...
    // [Buy orders processing code would go here, following the same pattern]

    return [...sellOrdersInfo, ...buyOrdersInfo];

  } catch (error) {
    log('Error: ' + error);
    return [];
  }
}

function logOrderDetails(order: OrderInfo, log: (message: string) => void) {
  log('\n----------------------------------------');
  log('Order: ' + order.orderAccount);
  log('Status: ' + order.orderStatus);
  
  if (order.fillStatus.isPartiallyFilled) {
    log(`Fill Status: ${order.fillStatus.percentageFilled.toFixed(2)}% filled`);
    log(`Remaining Amount: ${order.fillStatus.remainingAmount}`);
  }
  
  log('Maker: ' + order.maker);
  
  if (order.expiryTime > 0) {
    log('Expires: ' + new Date(order.expiryTime * 1000).toLocaleString());
  }
  
  log('----------------------------------------');
}

// Main execution remains similar to original
async function findAllOrders() {
  try {
    if (fs.existsSync('order_output.txt')) {
      fs.unlinkSync('order_output.txt');
    }
    
    const outputStream = fs.createWriteStream('order_output.txt');
    const log = (message: string) => {
      console.log(message);
      outputStream.write(message + '\n');
    };

    log('\n=== Starting Order Search ===\n');
    
    const chaosOrders = await findAllTokenOrders(CHAOS_MINT, 'CHAOS', log);
    const logosOrders = await findAllTokenOrders(LOGOS_MINT, 'LOGOS', log);
    
    // Add Summary Section
    log('\n=== OVERALL SUMMARY ===');
    log('\nCHAOS Orders:');
    log(`Total Orders: ${chaosOrders.length}`);
    log(`Active, no fills: ${chaosOrders.filter(o => o.orderStatus === 'active').length}`);
    
    const chaosPartialFills = chaosOrders.filter(o => o.orderStatus === 'active_partial');
    chaosPartialFills.forEach(order => {
      const remainingFormatted = Number(order.fillStatus.remainingAmount) / 
        Math.pow(10, order.inputDecimals.decimals);
      log(`Active, partial fill: ${order.fillStatus.percentageFilled.toFixed(2)}% filled, ${remainingFormatted.toFixed(order.inputDecimals.decimals)} ${order.tokenName} remaining`);
    });
    
    // Add details for expired partials
    const chaosExpiredPartials = chaosOrders.filter(o => o.orderStatus === 'expired_partial');
    log(`Expired, partial fill: ${chaosExpiredPartials.length}`);
    if (chaosExpiredPartials.length > 0) {
      log('Expired partial fill details:');
      chaosExpiredPartials.forEach(order => {
        const remainingFormatted = Number(order.fillStatus.remainingAmount) / 
          Math.pow(10, order.inputDecimals.decimals);
        log(`  - ${order.fillStatus.percentageFilled.toFixed(2)}% filled, ${remainingFormatted.toFixed(order.inputDecimals.decimals)} ${order.tokenName} remaining`);
      });
    }
    
    log('\nLOGOS Orders:');
    log(`Total Orders: ${logosOrders.length}`);
    log(`Active, no fills: ${logosOrders.filter(o => o.orderStatus === 'active').length}`);
    
    const logosPartialFills = logosOrders.filter(o => o.orderStatus === 'active_partial');
    logosPartialFills.forEach(order => {
      const remainingFormatted = Number(order.fillStatus.remainingAmount) / 
        Math.pow(10, order.inputDecimals.decimals);
      log(`Active, partial fill: ${order.fillStatus.percentageFilled.toFixed(2)}% filled, ${remainingFormatted.toFixed(order.inputDecimals.decimals)} ${order.tokenName} remaining`);
    });
    
    log(`Expired, partial fill: ${logosOrders.filter(o => o.orderStatus === 'expired_partial').length}`);
    
    outputStream.end();
    
    return [...chaosOrders, ...logosOrders];
  } catch (error) {
    console.error('Error in findAllOrders:', error);
    process.exit(1);
  }
}

(async () => {
  try {
    await findAllOrders();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();