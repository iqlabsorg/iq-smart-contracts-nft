import hre, { ethers } from 'hardhat';
import { ContractReceipt, ContractTransaction } from 'ethers';
import { expect } from 'chai';
import Assertion = Chai.Assertion;

export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
export type NamedSigner = Awaited<ReturnType<typeof ethers.getNamedSigner>>;

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

/**
 * Asserts contract call was reverted with specific custom error.
 * @param tx Contract call result promise.
 * @param error Custom error name.
 * @param errorParams Custom error params.
 */
export const expectError = async (tx: Promise<unknown>, error: string, errorParams: unknown[]): Promise<void> => {
  await expect(tx).to.be.revertedWith(
    `${error}(${errorParams.map(p => (typeof p === 'string' ? `"${p}"` : p)).join(', ')})`,
  );
};
