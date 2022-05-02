import hre, { ethers } from 'hardhat';
import { BigNumber, BigNumberish, BytesLike, Signer } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { formatBytes32String } from 'ethers/lib/utils';
import { wait } from '../../tasks';
import {
  ERC721,
  ERC721Mock,
  FixedPriceListingController,
  IACL,
  IAssetClassRegistry,
  IListingManager,
  IListingStrategyRegistry,
  IMetahub,
  IUniverseRegistry,
  IWarperManager,
  IWarperPresetFactory,
  IWarperPreset__factory,
  WarperPresetFactory,
} from '../../typechain';
import { Assets } from '../../typechain/contracts/metahub/Metahub';
import { ASSET_CLASS, LISTING_STRATEGY } from './constants';

const { solidityKeccak256, hexDataSlice, defaultAbiCoder } = ethers.utils;

export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

export const randomInteger = (max: number): number => {
  return Math.floor(Math.random() * max);
};

export const mineBlock = async (timestamp = 0): Promise<unknown> => {
  return ethers.provider.send('evm_mine', timestamp > 0 ? [timestamp] : []);
};

export const latestBlockTimestamp = async (): Promise<number> => {
  return (await ethers.provider.getBlock('latest')).timestamp;
};

export const waitBlockchainTime = async (seconds: number): Promise<void> => {
  const time = await latestBlockTimestamp();
  await mineBlock(time + seconds);
};

/**
 * Calculates ID by taking 4 byte of the provided string hashed value.
 * @param string Arbitrary string.
 */
export const solidityId = (string: string): string => {
  return hexDataSlice(solidityKeccak256(['string'], [string]), 0, 4);
};

/**
 * Performs universe creation call and returns universe ID.
 * @param universeRegistry
 * @param params
 */
export const createUniverse = async (
  universeRegistry: IUniverseRegistry,
  ...params: Parameters<IUniverseRegistry['createUniverse']>
): Promise<BigNumber> => {
  const receipt = await wait(universeRegistry.createUniverse(...params));
  const events = await universeRegistry.queryFilter(universeRegistry.filters.UniverseCreated(), receipt.blockHash);
  return events[0].args.universeId;
};

/**
 * Deploys a warper from preset via factory and returns warper address.
 */
export const deployWarperPreset = async (
  factory: IWarperPresetFactory,
  presetId: BytesLike,
  metahubAddress: string,
  originalAddress: string,
): Promise<string> => {
  const initData = IWarperPreset__factory.createInterface().encodeFunctionData('__initialize', [
    defaultAbiCoder.encode(['address', 'address'], [originalAddress, metahubAddress]),
  ]);
  return deployWarperPresetWithInitData(factory, presetId, initData);
};

/**
 * Deploys a warper from preset via factory and returns warper address.
 * @param factory
 * @param params
 */
export const deployWarperPresetWithInitData = async (
  factory: IWarperPresetFactory,
  ...params: Parameters<WarperPresetFactory['deployPreset']>
): Promise<string> => {
  const receipt = await wait(factory.deployPreset(...params));
  const events = await factory.queryFilter(factory.filters.WarperPresetDeployed(), receipt.blockHash);
  return events[0].args.warper;
};

export const registerWarper = async (
  manager: IWarperManager,
  ...params: Parameters<IWarperManager['registerWarper']>
): Promise<string> => {
  const receipt = await wait(manager.registerWarper(...params));
  const events = await manager.queryFilter(manager.filters.WarperRegistered(), receipt.blockHash);
  return events[0].args.warper;
};

export const deployRandomERC721Token = async (): Promise<{ address: string; symbol: string; name: string }> => {
  const n = randomInteger(1000);
  const name = `ERC721 token #${n}`;
  const symbol = `NFT${n}`;
  const { address } = (await hre.run('deploy:mock:ERC721', { name, symbol })) as ERC721;

  return { address, symbol, name };
};

/**
 * Creates ERC721 Asset structure.
 * @param token
 * @param tokenId
 * @param value
 */
export const makeERC721Asset = (token: string, tokenId: BigNumberish, value: BigNumberish = 1): Assets.AssetStruct => {
  return makeAsset(ASSET_CLASS.ERC721, defaultAbiCoder.encode(['address', 'uint256'], [token, tokenId]), value);
};

/**
 * Creates Fixed Price listing strategy params structure.
 * @param baseRate
 */
export const makeFixedPriceStrategy = (baseRate: BigNumberish): { strategy: string; data: string } => {
  return {
    strategy: LISTING_STRATEGY.FIXED_PRICE,
    data: defaultAbiCoder.encode(['uint256'], [baseRate]),
  };
};

/**
 * Creates Asset structure.
 * @param assetClass
 * @param data
 * @param value
 */
export const makeAsset = (assetClass: BytesLike, data: BytesLike, value: BigNumberish): Assets.AssetStruct => {
  return {
    id: { class: assetClass, data },
    value: BigNumber.from(value),
  };
};

/**
 * Typescript mapping of the possible warper rental states.
 * Mimics the `WarperRentalStatus` enum.
 */
export const ASSET_RENTAL_STATUS = {
  NONE: 0,
  AVAILABLE: 1,
  RENTED: 2,
};

interface ActorSet {
  successfulSigner: Signer;
  stranger: Signer;
  requiredRole: string;
}

export class AccessControlledHelper {
  public static adminData: ActorSet;
  public static supervisorData: ActorSet;

  static async registerAdmin(successfulSigner: Signer, stranger: Signer, acl: IACL): Promise<void> {
    const adminBytes = await acl.adminRole();
    AccessControlledHelper.adminData = {
      successfulSigner,
      stranger,
      requiredRole: adminBytes,
    };
  }

  static async registerSupervisor(successfulSigner: Signer, stranger: Signer, acl: IACL): Promise<void> {
    const supervisorBytes = await acl.supervisorRole();
    AccessControlledHelper.supervisorData = {
      successfulSigner,
      stranger,
      requiredRole: supervisorBytes,
    };
  }

  static onlyAdminCan(tx: (signer: Signer) => Promise<void>): void {
    return AccessControlledHelper.onlyRoleCan('admin', () => AccessControlledHelper.adminData, tx);
  }

  static onlySupervisorCan(tx: (signer: Signer) => Promise<void>): void {
    return AccessControlledHelper.onlyRoleCan('supervisor', () => AccessControlledHelper.supervisorData, tx);
  }

  private static onlyRoleCan(roleName: string, actorSet: () => ActorSet, tx: (signer: Signer) => Promise<void>): void {
    context(`When called by ${roleName}`, () => {
      it('executes successfully', async () => {
        await tx(actorSet().successfulSigner);
      });
    });

    context('When called by stranger', () => {
      it('reverts', async () => {
        await expect(tx(actorSet().stranger)).to.eventually.revertedByACL(
          await actorSet().stranger.getAddress(),
          actorSet().requiredRole,
        );
      });
    });
  }
}

export class AssetListerHelper {
  public static warperPresetId = formatBytes32String('ERC721Basic');

  constructor(
    readonly assetClassRegistry: IAssetClassRegistry,
    readonly assetController: string,
    readonly erc721assetVault: string,
    readonly listingManager: IListingManager,
    readonly metahub: IMetahub,
    readonly universeRegistry: IUniverseRegistry,
    readonly warperPresetFactory: IWarperPresetFactory,
    readonly listingStrategyRegistry: IListingStrategyRegistry,
    readonly fixedPriceListingController: FixedPriceListingController,
  ) {}

  async setupRegistries(): Promise<void> {
    await this.assetClassRegistry.registerAssetClass(ASSET_CLASS.ERC721, {
      controller: this.assetController,
      vault: this.erc721assetVault,
    });
    await this.listingStrategyRegistry.registerListingStrategy(LISTING_STRATEGY.FIXED_PRICE, {
      controller: this.fixedPriceListingController.address,
    });
  }

  async setupUniverse(universeRegistrationParams: IUniverseRegistry.UniverseParamsStruct): Promise<BigNumber> {
    return createUniverse(this.universeRegistry, universeRegistrationParams);
  }

  async setupWarper(
    originalAsset: ERC721Mock,
    universeId: BigNumber,
    warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct,
  ): Promise<string> {
    const warperAddress = await deployWarperPreset(
      this.warperPresetFactory,
      AssetListerHelper.warperPresetId,
      this.metahub.address,
      originalAsset.address,
    );
    await this.metahub.registerWarper(warperAddress, { ...warperRegistrationParams, universeId });
    return warperAddress;
  }

  async listAsset(
    lister: SignerWithAddress,
    originalAsset: ERC721Mock,
    maxLockPeriod: number,
    baseRate: number,
    tokenId: BigNumber,
    immediatePayout: boolean,
  ): Promise<BigNumber> {
    await originalAsset.connect(lister).setApprovalForAll(this.metahub.address, true);

    const asset = makeERC721Asset(originalAsset.address, tokenId);
    const listingParams = makeFixedPriceStrategy(baseRate);

    const listingId = await this.listingManager
      .connect(lister)
      .callStatic.listAsset(asset, listingParams, maxLockPeriod, false);
    await this.listingManager.connect(lister).listAsset(asset, listingParams, maxLockPeriod, immediatePayout);

    return listingId;
  }
}
