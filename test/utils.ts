import hre from 'hardhat';
import { ContractReceipt, ContractTransaction } from 'ethers';

export const wait = async (txPromise: Promise<ContractTransaction>): Promise<ContractReceipt> => {
  return (await txPromise).wait();
};

export const mineBlock = async (timestamp = 0): Promise<unknown> => {
  return await hre.ethers.provider.send('evm_mine', timestamp > 0 ? [timestamp] : []);
};

export const latestBlockTimestamp = async (): Promise<number> =>
  (await hre.ethers.provider.getBlock('latest')).timestamp;

export const waitBlockchainTime = async (seconds: number): Promise<void> => {
  const time = await latestBlockTimestamp();
  await mineBlock(time + seconds);
};
