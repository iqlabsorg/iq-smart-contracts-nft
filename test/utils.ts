import hre from 'hardhat';
import { BigNumber, ContractReceipt, ContractTransaction } from 'ethers';
import { Metahub, WarperPresetFactory } from '../typechain';

export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

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
 * Performs universe creation call and returns universe ID.
 * @param metahub
 * @param params
 */
export const createUniverse = async (
  metahub: Metahub,
  ...params: Parameters<Metahub['createUniverse']>
): Promise<BigNumber> => {
  const receipt = await wait(metahub.createUniverse(...params));
  const events = await metahub.queryFilter(metahub.filters.UniverseCreated(), receipt.blockHash);
  return events[0].args.universeId;
};

/**
 * Deploys a warper from preset via factory and returns warper address.
 * @param factory
 * @param params
 */
export const deployWarperPreset = async (
  factory: WarperPresetFactory,
  ...params: Parameters<WarperPresetFactory['deployPreset']>
): Promise<string> => {
  const receipt = await wait(factory.deployPreset(...params));
  const events = await factory.queryFilter(factory.filters.WarperPresetDeployed(), receipt.blockHash);
  return events[0].args.warper;
};

/**
 * Deploys a warper from preset via metahub and returns warper address.
 * @param metahub
 * @param params
 */
export const deployWarper = async (
  metahub: Metahub,
  ...params: Parameters<Metahub['deployWarper']>
): Promise<string> => {
  const receipt = await wait(metahub.deployWarper(...params));
  const events = await metahub.queryFilter(metahub.filters.WarperRegistered(), receipt.blockHash);
  return events[0].args.warper;
};
