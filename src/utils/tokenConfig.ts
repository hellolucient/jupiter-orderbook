import { decodePublicKey, encodeToPublicKey } from './instructionDecoder';

// Token configuration containing all token-related data
export const TOKENS = {
    CHAOS: {
        address: '8SgNwESovnbG1oNEaPVhg6CR9mTMSK7jPvcYRe3wpump',
        decimals: 6,
        name: 'CHAOS'
    },
    LOGOS: {
        address: 'HJUfqXoYjC653f2p33i84zdCC3jc4EuVnbruSe5kpump',
        decimals: 6,
        name: 'LOGOS'
    },
    USDC: {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        name: 'USDC'
    },
    SOL: {
        address: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        name: 'SOL'
    }
} as const;

export interface TokenDecimalInfo {
    decimals: number;
    isKnown: boolean;
}

// Helper functions
export function getTokenDecimals(mintAddress: string): TokenDecimalInfo {
    const token = Object.values(TOKENS).find(t => t.address === mintAddress);
    return {
        decimals: token?.decimals ?? 6,
        isKnown: !!token
    };
}

export function decodeAddress(address: string): { base58: string; hex: string } {
    return {
        base58: address,
        hex: decodePublicKey(address)
    };
}

// Debug function
export function printTokenInfo() {
    console.log('\nToken Information:\n');
    Object.entries(TOKENS).forEach(([key, token]) => {
        console.log(`${token.name}:`);
        console.log(`Address: ${token.address}`);
        console.log(`Decimals: ${token.decimals}`);
        console.log(`Hex: ${decodePublicKey(token.address)}\n`);
    });
} 