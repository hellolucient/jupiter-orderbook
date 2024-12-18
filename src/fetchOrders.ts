import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=3632daae-4968-4896-9d0d-43f382188194');
const jupiterLimitOrderProgramId = new PublicKey('j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X');
const CHAOS_MINT = new PublicKey('8SgNwESovnbG1oNEaPVhg6CR9mTMSK7jPvcYRe3wpump');

async function findChaosOrders() {
  try {
    console.log('Looking for all CHAOS orders...');
    
    // Search for orders where CHAOS is either input or output
    const accounts = await connection.getProgramAccounts(jupiterLimitOrderProgramId, {
      commitment: 'confirmed',
      filters: [
        { dataSize: 372 }, // Size of a limit order account
        {
          memcmp: {
            offset: 40, // Check for CHAOS as input token
            bytes: CHAOS_MINT.toBase58()
          }
        }
      ]
    });

    console.log(`\nFound ${accounts.length} CHAOS orders`);
    
    for (const account of accounts) {
      console.log('\nOrder:', account.pubkey.toString());
      const data = account.account.data;
      
      // Get key information about this order
      const maker = new PublicKey(data.slice(8, 40));
      const inputMint = new PublicKey(data.slice(40, 72));
      const outputMint = new PublicKey(data.slice(72, 104));
      
      console.log('Maker:', maker.toString());
      console.log('Input Token:', inputMint.toString());
      console.log('Output Token:', outputMint.toString());
      
      // We'll add price/amount decoding later
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

findChaosOrders();