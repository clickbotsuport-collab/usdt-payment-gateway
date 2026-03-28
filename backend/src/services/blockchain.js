import axios from 'axios';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;
const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';
const provider = new ethers.JsonRpcProvider(BSC_RPC);

// Minimal ERC20 ABI for USDT
const USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

/**
 * Fetches recent USDT transfers for a specific address using BscScan API
 */
export const getUSDTTransfers = async (address) => {
  try {
    const url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${USDT_CONTRACT}&address=${address}&page=1&offset=10&sort=desc&apikey=${BSCSCAN_API_KEY}`;
    const response = await axios.get(url);

    if (response.data.status === '1') {
      return response.data.result;
    }
    return [];
  } catch (error) {
    console.error(`Error fetching transfers for ${address}:`, error.message);
    return [];
  }
};

/**
 * Checks the USDT balance of an address
 */
export const getUSDTBalance = async (address) => {
  try {
    const contract = new ethers.Contract(USDT_CONTRACT, USDT_ABI, provider);
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, 18); // USDT on BSC has 18 decimals
  } catch (error) {
    console.error(`Error checking balance for ${address}:`, error.message);
    return "0";
  }
};

/**
 * Consolidates USDT from a user wallet to the main hot wallet
 * Requires the user's private key (derived from index)
 */
export const consolidateFunds = async (userWallet, amount) => {
  try {
    const contract = new ethers.Contract(USDT_CONTRACT, USDT_ABI, userWallet);
    const amountWei = ethers.parseUnits(amount.toString(), 18);

    // Check BNB balance for gas
    const bnbBalance = await provider.getBalance(userWallet.address);
    if (bnbBalance < ethers.parseEther("0.001")) {
      throw new Error(`Insufficient BNB for gas on ${userWallet.address}`);
    }

    const tx = await contract.transfer(process.env.MAIN_HOT_WALLET_ADDRESS, amountWei);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error(`Consolidation failed for ${userWallet.address}:`, error.message);
    throw error;
  }
};
