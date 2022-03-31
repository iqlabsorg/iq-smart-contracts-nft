import { ethers } from 'hardhat';
import { BigNumber, BigNumberish, BytesLike } from 'ethers';
import { IUniverseRegistry, IWarperManager, IWarperPresetFactory, WarperPresetFactory } from '../../typechain';
import { Assets } from '../../typechain/Metahub';
import { wait } from '../../tasks';

const { solidityKeccak256, hexDataSlice, defaultAbiCoder } = ethers.utils;

export const MaxUint32 = 2 ** 32 - 1;

export const RolesLibrary = {
  ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  SUPERVISOR_ROLE: '0x060c8eced3c6b422fe5573c862b67b9f6e25a3fc7d9543b14f7aee77b138e70d',
};

export const AssetClass = {
  ERC20: solidityId('ERC20'),
  ERC721: solidityId('ERC721'),
  ERC1155: solidityId('ERC1155'),
};

export const ListingStrategy = {
  FIXED_PRICE: solidityId('FIXED_PRICE'),
};

export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

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
 * @param universeRegistry
 * @param params
 */
export async function createUniverse(
  universeRegistry: IUniverseRegistry,
  ...params: Parameters<IUniverseRegistry['createUniverse']>
): Promise<BigNumber> {
  const receipt = await wait(universeRegistry.createUniverse(...params));
  const events = await universeRegistry.queryFilter(universeRegistry.filters.UniverseCreated(), receipt.blockHash);
  return events[0].args.universeId;
}

/**
 * Deploys a warper from preset via factory and returns warper address.
 * @param factory
 * @param params
 */
export async function deployWarperPreset(
  factory: IWarperPresetFactory,
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
export async function deployWarper(
  metahub: IWarperManager,
  ...params: Parameters<IWarperManager['deployWarper']>
): Promise<string> {
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
 * Creates Fixed Price listing strategy params structure.
 * @param baseRate
 */
export function makeFixedPriceStrategy(baseRate: BigNumberish) {
  return {
    strategy: ListingStrategy.FIXED_PRICE,
    data: defaultAbiCoder.encode(['uint256'], [baseRate]),
  };
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
export const AssetRentalStatus = {
  NONE: 0,
  AVAILABLE: 1,
  RENTED: 2,
};
