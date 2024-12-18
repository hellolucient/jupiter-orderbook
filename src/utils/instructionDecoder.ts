interface TokenInfo {
  decimals: number;
}

export function decodeInstructionData(
  instructionData: string,
  baseTokenDecimals: number,
  quoteTokenDecimals: number
) {
  const bytes = Array.from(Buffer.from(instructionData, 'base64'));
  
  console.log('Raw bytes:', bytes);  // Log raw bytes for inspection

  const instructionType = bytes[0];
  
  // makingAmount (what you're selling - 3,800 CHAOS)
  const rawMakingAmount = bytes.slice(1, 9).reduce((acc, byte, index) => {
    return acc + (BigInt(byte) << BigInt(8 * index));
  }, BigInt(0));
  
  // takingAmount (what you're getting - 121.6 USDC)
  const rawTakingAmount = bytes.slice(9, 17).reduce((acc, byte, index) => {
    return acc + (BigInt(byte) << BigInt(8 * index));
  }, BigInt(0));
  
  const makingAmount = Number(rawMakingAmount) / Math.pow(10, baseTokenDecimals);
  const takingAmount = Number(rawTakingAmount) / Math.pow(10, quoteTokenDecimals);
  
  return { 
    instructionType: instructionType === 1 ? 'buy' : 'sell',
    makingAmount,    // Amount of CHAOS you're selling
    takingAmount,    // Amount of USDC you're receiving
    price: takingAmount / makingAmount  // Price per CHAOS in USDC
  };
} 