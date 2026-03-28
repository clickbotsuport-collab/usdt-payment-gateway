import { TatumSDK, Network } from '@tatumio/tatum';
import dotenv from 'dotenv';
import { supabase } from '../config/supabase.js';

dotenv.config();

let tatum;

export const initTatum = async () => {
  if (tatum) return tatum;
  
  const network = process.env.TATUM_NETWORK === 'BSC' ? Network.BINANCE_SMART_CHAIN : Network.BINANCE_SMART_CHAIN_TESTNET;
  
  tatum = await TatumSDK.init({
    network: network,
    apiKey: { v2: process.env.TATUM_API_KEY },
  });
  
  return tatum;
};

/**
 * Derives a BSC address from mnemonic using user index
 */
export const deriveTatumAddress = async (index) => {
  const sdk = await initTatum();
  // Using Tatum's wallet generation or standard ethers derivation
  // Since we have the mnemonic, we can use Tatum's wallet features
  const wallet = await sdk.wallet.generate({
    mnemonic: process.env.MNEMONIC,
    index: parseInt(index)
  });
  
  return wallet;
};

/**
 * Subscribes to incoming transfers for a specific address
 */
export const subscribeToAddress = async (address) => {
  const sdk = await initTatum();
  try {
    const subscription = await sdk.notification.subscribe.addressEvent({
      url: `${process.env.APP_URL}/api/webhooks/tatum`,
      address: address
    });
    return subscription;
  } catch (err) {
    console.error(`Failed to subscribe for ${address}:`, err.message);
  }
};

/**
 * Get USDT Balance using Tatum
 */
export const getUSDTBalanceTatum = async (address) => {
  const sdk = await initTatum();
  const balances = await sdk.address.getBalance({
    addresses: [address],
    tokenTypes: ['fungible']
  });
  
  const usdt = balances.data.find(b => b.tokenAddress?.toLowerCase() === process.env.USDT_CONTRACT_ADDRESS.toLowerCase());
  return usdt ? usdt.balance : "0";
};

/**
 * Consolidate funds using Tatum
 */
export const transferUSDTWithTatum = async (fromPrivateKey, toAddress, amount) => {
  const sdk = await initTatum();
  const tx = await sdk.token.transfer({
    tokenAddress: process.env.USDT_CONTRACT_ADDRESS,
    to: toAddress,
    amount: amount.toString(),
    privateKey: fromPrivateKey
  });
  
  return tx.txId;
};
