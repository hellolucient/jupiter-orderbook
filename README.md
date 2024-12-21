# Jupiter Orderbook Explorer

A tool for exploring and analyzing Jupiter's CHAOS limit orders on Solana.

## Features
- Fetch all CHAOS limit orders
- Decode order details (maker, input token, output token)
- Analyze orderbook data

## Setup

bash
Install dependencies
npm install
Run the order fetcher
npx ts-node src/fetchOrders.ts


## Project Structure
- `src/fetchOrders.ts`: Main script for fetching and analyzing orders
- `src/utils/instructionDecoder.ts`: Utilities for decoding order data