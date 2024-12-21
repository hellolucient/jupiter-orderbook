import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { getTokenDecimals, TOKENS } from './utils/tokenConfig';
import * as fs from 'fs';

// Clear terminal and add some process management
process.stdout.write('\x1Bc'); // Clear terminal
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

interface OrderInfo {
  orderAccount: string;
  maker: string;
  inputMint: string;
  outputMint: string;
  isBuyOrder: boolean;
  inputAmount: bigint;
  outputAmount: bigint;
  expiryTime: number;
  tokenName: string;
  inputDecimals: TokenDecimalInfo;
  outputDecimals: TokenDecimalInfo;
}

function getUint64(dataView: DataView, offset: number): bigint {
  const left = dataView.getUint32(offset, true);
  const right = dataView.getUint32(offset + 4, true);
  return BigInt(left) + (BigInt(right) << 32n);
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
      const dataView = new DataView(data.buffer);
      const inputMint = new PublicKey(data.slice(56, 88)).toString();
      const outputMint = new PublicKey(data.slice(88, 120)).toString();
      
      return {
        orderAccount: account.pubkey.toString(),
        maker: new PublicKey(data.slice(24, 56)).toString(),
        inputMint,
        outputMint,
        inputAmount: getUint64(dataView, 120),
        outputAmount: getUint64(dataView, 128),
        expiryTime: Number(getUint64(dataView, 160)),
        isBuyOrder: false,
        tokenName,
        inputDecimals: getTokenDecimals(inputMint),
        outputDecimals: getTokenDecimals(outputMint)
      } as OrderInfo;
    });

    sellOrdersInfo.forEach(order => {
      log('\n----------------------------------------');
      log('Order: ' + order.orderAccount);
      log('Maker: ' + order.maker);
      log(`Input Token (${order.tokenName}): ${order.inputMint}`);
      log('Output Token: ' + order.outputMint);
      
      // Show both raw and decoded amounts
      log('\nRaw Amounts:');
      log('Making Amount: ' + order.inputAmount.toString());
      log('Taking Amount: ' + order.outputAmount.toString());
      
      // Convert amounts using proper decimals
      const sellAmount = Number(order.inputAmount) / Math.pow(10, order.inputDecimals.decimals);
      const takingAmount = Number(order.outputAmount) / Math.pow(10, order.outputDecimals.decimals);
      const pricePerToken = takingAmount / sellAmount;
      
      log('\nDecoded Amounts:');
      if (!order.inputDecimals.isKnown) {
        log('⚠️ Warning: Using assumed 6 decimals for input token');
      }
      if (!order.outputDecimals.isKnown) {
        log('⚠️ Warning: Using assumed 6 decimals for output token');
      }
      log('Amount Selling: ' + sellAmount.toFixed(order.inputDecimals.decimals) + ' ' + order.tokenName);
      log('Amount Taking: ' + takingAmount.toFixed(order.outputDecimals.decimals) + ' USDC');
      log('Price per Token: ' + pricePerToken.toFixed(6) + ' USDC');
      
      log('\nExpires: ' + new Date(order.expiryTime * 1000).toLocaleString());
      
      // Raw data output
      log('\nRaw Data:');
      const data = Buffer.from(sellOrders.find(o => o.pubkey.toString() === order.orderAccount)?.account.data || []);
      log(data.toString('hex'));
      log('----------------------------------------');
    });

    // Process buy orders
    log(`\n=== ${tokenName} BUY ORDERS ===`);
    const buyOrdersInfo = buyOrders.map(account => {
      const data = account.account.data;
      const dataView = new DataView(data.buffer);
      const inputMint = new PublicKey(data.slice(56, 88)).toString();
      const outputMint = new PublicKey(data.slice(88, 120)).toString();
      
      return {
        orderAccount: account.pubkey.toString(),
        maker: new PublicKey(data.slice(24, 56)).toString(),
        inputMint,
        outputMint,
        inputAmount: getUint64(dataView, 120),
        outputAmount: getUint64(dataView, 128),
        expiryTime: Number(getUint64(dataView, 160)),
        isBuyOrder: true,
        tokenName,
        inputDecimals: getTokenDecimals(inputMint),
        outputDecimals: getTokenDecimals(outputMint)
      } as OrderInfo;
    });

    buyOrdersInfo.forEach(order => {
      log('\n----------------------------------------');
      log('Order: ' + order.orderAccount);
      log('Maker: ' + order.maker);
      log('Input Token: ' + order.inputMint);
      log(`Output Token (${order.tokenName}): ${order.outputMint}`);
      
      // Convert amounts using proper decimals
      const buyAmount = Number(order.outputAmount) / Math.pow(10, order.outputDecimals.decimals);
      const takingAmount = Number(order.inputAmount) / Math.pow(10, order.inputDecimals.decimals);
      const pricePerToken = takingAmount / buyAmount;
      
      log('\nDecoded Amounts:');
      if (!order.inputDecimals.isKnown) {
        log('⚠️ Warning: Using assumed 6 decimals for input token');
      }
      if (!order.outputDecimals.isKnown) {
        log('⚠️ Warning: Using assumed 6 decimals for output token');
      }
      log('Amount Buying: ' + buyAmount.toFixed(order.outputDecimals.decimals) + ' ' + order.tokenName);
      log('Price: ' + pricePerToken.toFixed(6) + ' USDC');
      log('Expires: ' + new Date(order.expiryTime * 1000).toLocaleString());
      
      // Raw data output
      log('\nRaw Data:');
      const data = Buffer.from(buyOrders.find(o => o.pubkey.toString() === order.orderAccount)?.account.data || []);
      log(data.toString('hex'));
      log('----------------------------------------');
    });

    return [...buyOrdersInfo, ...sellOrdersInfo];

  } catch (error) {
    log('Error: ' + error);
    return [];
  }
}

// Modify findAllOrders to include better initialization
async function findAllOrders() {
  try {
    // Clear any existing output file
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
    
    log('\n=== FINAL SUMMARY ===');
    log('CHAOS Orders: ' + chaosOrders.length);
    log('LOGOS Orders: ' + logosOrders.length);
    log('Total Orders: ' + (chaosOrders.length + logosOrders.length));
    log('----------------------------------------');
    
    outputStream.end();
    
    return [...chaosOrders, ...logosOrders];
  } catch (error) {
    console.error('Error in findAllOrders:', error);
    process.exit(1);
  }
}

// Wrap the main execution in an async IIFE with proper error handling
(async () => {
  try {
    await findAllOrders();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();