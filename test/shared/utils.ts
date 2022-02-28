import { ethers } from 'hardhat';
import { BigNumber, BigNumberish, BytesLike, ContractReceipt, ContractTransaction } from 'ethers';
import { Metahub, WarperPresetFactory } from '../../typechain';
import { Assets } from '../../typechain/Metahub';

const { solidityKeccak256, hexDataSlice, defaultAbiCoder } = ethers.utils;

export const AssetClass = {
  ERC20: solidityId('ERC20'),
  ERC721: solidityId('ERC721'),
  ERC1155: solidityId('ERC1155'),
};

export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

export async function wait(txPromise: Promise<ContractTransaction>): Promise<ContractReceipt> {
  return (await txPromise).wait();
}

export async function mineBlock(timestamp = 0): Promise<unknown> {
  return await ethers.provider.send('evm_mine', timestamp > 0 ? [timestamp] : []);
}

export async function latestBlockTimestamp(): Promise<number> {
  return await (
    await ethers.provider.getBlock('latest')
  ).timestamp;
}

export async function waitBlockchainTime(seconds: number): Promise<void> {
  const time = await latestBlockTimestamp();
  await mineBlock(time + seconds);
}

/**
 * Calculates ID by taking 4 byte of the provided string hashed value.
 * @param string Arbitrary string.
 */
export function solidityId(string: string): string {
  return hexDataSlice(solidityKeccak256(['string'], [string]), 0, 4);
}

/**
 * Performs universe creation call and returns universe ID.
 * @param metahub
 * @param params
 */
export async function createUniverse(
  metahub: Metahub,
  ...params: Parameters<Metahub['createUniverse']>
): Promise<BigNumber> {
  const receipt = await wait(metahub.createUniverse(...params));
  const events = await metahub.queryFilter(metahub.filters.UniverseCreated(), receipt.blockHash);
  return events[0].args.universeId;
}

/**
 * Deploys a warper from preset via factory and returns warper address.
 * @param factory
 * @param params
 */
export async function deployWarperPreset(
  factory: WarperPresetFactory,
  ...params: Parameters<WarperPresetFactory['deployPreset']>
): Promise<string> {
  const receipt = await wait(factory.deployPreset(...params));
  const events = await factory.queryFilter(factory.filters.WarperPresetDeployed(), receipt.blockHash);
  return events[0].args.warper;
}

/**
 * Deploys a warper from preset via metahub and returns warper address.
 * @param metahub
 * @param params
 */
export async function deployWarper(metahub: Metahub, ...params: Parameters<Metahub['deployWarper']>): Promise<string> {
  const receipt = await wait(metahub.deployWarper(...params));
  const events = await metahub.queryFilter(metahub.filters.WarperRegistered(), receipt.blockHash);
  return events[0].args.warper;
}

/**
 * Creates ERC721 Asset structure.
 * @param token
 * @param tokenId
 * @param value
 */
export function makeERC721Asset(token: string, tokenId: BigNumberish, value: BigNumberish = 1) {
  return makeAsset(AssetClass.ERC721, defaultAbiCoder.encode(['address', 'uint256'], [token, tokenId]), value);
}

/**
 * Creates Asset structure.
 * @param assetClass
 * @param data
 * @param value
 */
export function makeAsset(assetClass: BytesLike, data: BytesLike, value: BigNumberish): Assets.AssetStruct {
  return {
    id: { class: assetClass, data },
    value,
  };
}

/**
 * Typescript mapping of the possible warper rental states.
 * Mimics the `WarperRentalStatus` enum.
 */
export const WarperRentalStatus = {
  NOT_MINTED: 0,
  MINTED: 1,
  RENTED: 2,
};
