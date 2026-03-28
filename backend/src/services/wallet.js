import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const mnemonic = process.env.MNEMONIC;

/**
 * Derives a unique BSC address based on an internal user ID.
 * Follows BIP44 path: m/44'/60'/0'/0/{index}
 * @param {number|string} userIndex The unique index for the user (can be their internal ID)
 * @returns {Object} { address, privateKey } - WARNING: Never expose privateKey to frontend
 */
export const deriveAddress = (userIndex) => {
  if (!mnemonic) {
    throw new Error('Mnemonic not found in environment variables');
  }

  // Use index from internal ID. If it's a UUID, hash it or use a sequence
  // For this gateway, we assume userIndex is a sequential number or mappable to one.
  // If userIndex is not a number, we can use it as a string to derive a deterministic path.
  const path = `m/44'/60'/0'/0/${userIndex}`;
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic).derivePath(path);

  return {
    address: hdNode.address,
    privateKey: hdNode.privateKey,
  };
};

/**
 * Gets a Wallet instance for a specific user to sign transactions (e.g. consolidation)
 */
export const getWalletForUser = (userIndex, provider) => {
  const { privateKey } = deriveAddress(userIndex);
  return new ethers.Wallet(privateKey, provider);
};
