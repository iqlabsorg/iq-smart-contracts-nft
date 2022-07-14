import hre, { ethers } from 'hardhat';
import { BigNumber, BigNumberish, BytesLike, ContractReceipt, ContractTransaction, Signer } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { defaultAbiCoder } from 'ethers/lib/utils';
import {
  ERC721,
  ERC721Mock,
  ERC721__factory,
  IACL,
  IAssetClassRegistry,
  IAssetVault,
  IAssetVault__factory,
  IListingManager,
  IListingStrategyRegistry,
  IMetahub,
  IUniverseRegistry,
  IWarperManager,
  IWarperPresetFactory,
  IWarperPreset__factory,
  WarperPresetFactory,
  IERC721AssetVault,
  IAssetController,
} from '../../typechain';
import { ASSET_CLASS, makeERC721Asset, makeFixedPriceStrategy } from '../../src';
import { PRESET_CONFIGURABLE_ID } from '../../tasks/deployment';

export const wait = async (txPromise: Promise<ContractTransaction>): Promise<ContractReceipt> => {
  return (await txPromise).wait();
};

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

interface ActorSet {
  successfulSigner: Signer;
  stranger: Signer;
  requiredRole: string;
}

export class AccessControlledHelper {
  public static adminData: ActorSet;
  public static supervisorData: ActorSet;
  public static universeData: ActorSet;

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

  static registerUniverseOwner(successfulSigner: Signer, stranger: Signer): void {
    AccessControlledHelper.universeData = {
      successfulSigner,
      stranger,
      requiredRole: '0x0',
    };
  }

  static onlyAdminCan(tx: (signer: Signer) => Promise<void>): void {
    return AccessControlledHelper.onlyRoleCan('admin', () => AccessControlledHelper.adminData, tx);
  }

  static onlySupervisorCan(tx: (signer: Signer) => Promise<void>): void {
    return AccessControlledHelper.onlyRoleCan('supervisor', () => AccessControlledHelper.supervisorData, tx);
  }

  static onlyUniverseOwnerCan(tx: (signer: Signer) => Promise<void>): void {
    return AccessControlledHelper.onlyRoleCan('universeOwner', () => AccessControlledHelper.universeData, tx);
  }

  private static onlyRoleCan(
    roleName: 'admin' | 'universeOwner' | 'supervisor',
    actorSet: () => ActorSet,
    tx: (signer: Signer) => Promise<void>,
  ): void {
    context(`When called by ${roleName}`, () => {
      it('executes successfully', async () => {
        await tx(actorSet().successfulSigner);
      });
    });

    context('When called by stranger', () => {
      it('reverts', async () => {
        const strangerAddress = await actorSet().stranger.getAddress();

        if (roleName === 'universeOwner') {
          await expect(tx(actorSet().stranger)).to.be.revertedWith(`AccountIsNotUniverseOwner("${strangerAddress}")`);
        } else {
          await expect(tx(actorSet().stranger)).to.be.revertedByACL(strangerAddress, actorSet().requiredRole);
        }
      });
    });
  }
}

class BuilderNotConfiguredError extends Error {
  constructor() {
    super('Builder not properly configured');
  }
}

export class AssetListerHelperBuilder {
  public warperPresetId?: string = undefined;
  public assetClassRegistry?: IAssetClassRegistry = undefined;
  public assetController?: IAssetController = undefined;
  public listingManager?: IListingManager = undefined;
  public metahub?: IMetahub = undefined;
  public warperManager?: IWarperManager = undefined;
  public universeRegistry?: IUniverseRegistry = undefined;
  public warperPresetFactory?: IWarperPresetFactory = undefined;

  withAssetClassRegistry(assetClassRegistry: IAssetClassRegistry): this {
    this.assetClassRegistry = assetClassRegistry;
    return this;
  }

  withAssetController(assetController: IAssetController): this {
    this.assetController = assetController;
    return this;
  }

  withListingManager(listingManager: IListingManager): this {
    this.listingManager = listingManager;
    return this;
  }

  withMetahub(metahub: IMetahub): this {
    this.metahub = metahub;
    return this;
  }

  withWarperManager(warperManager: IWarperManager): this {
    this.warperManager = warperManager;
    return this;
  }

  withUniverseRegistry(universeRegistry: IUniverseRegistry): this {
    this.universeRegistry = universeRegistry;
    return this;
  }
  withWarperPresetFactory(warperPresetFactory: IWarperPresetFactory): this {
    this.warperPresetFactory = warperPresetFactory;
    return this;
  }

  withConfigurableWarperPreset(): this {
    this.warperPresetId = PRESET_CONFIGURABLE_ID;
    return this;
  }

  intoUniverseHelper(): UniverseHelper {
    if (this.universeRegistry === undefined) {
      throw new BuilderNotConfiguredError();
    }

    return new UniverseHelper(this.universeRegistry);
  }

  intoListerHelper(): ListerHelper {
    if (this.metahub === undefined || this.listingManager === undefined) {
      throw new BuilderNotConfiguredError();
    }

    return new ListerHelper(this.metahub, this.listingManager);
  }

  intoWarperHelper(): WarperHelper {
    if (
      this.metahub === undefined ||
      this.warperPresetFactory === undefined ||
      this.warperManager === undefined ||
      this.warperPresetId === undefined
    ) {
      throw new BuilderNotConfiguredError();
    }

    return new WarperHelper(this.warperPresetFactory, this.metahub, this.warperManager, this.warperPresetId);
  }

  intoRegistryHelper(): RegistryHelper {
    if (
      this.assetClassRegistry === undefined ||
      this.assetController === undefined ||
      this.universeRegistry === undefined
    ) {
      throw new BuilderNotConfiguredError();
    }
    return new RegistryHelper(this.assetClassRegistry, this.assetController, this.universeRegistry);
  }
}

export class RegistryHelper {
  public assetVault?: IAssetVault = undefined;
  public assetClass?: BytesLike = undefined;

  constructor(
    readonly assetClassRegistry: IAssetClassRegistry,
    readonly assetController: IAssetController,
    readonly universeRegistry: IUniverseRegistry,
  ) {}

  withERC721Registries(erc721assetVault: IERC721AssetVault): this {
    this.assetClass = ASSET_CLASS.ERC721;
    this.assetVault = IAssetVault__factory.connect(erc721assetVault.address, erc721assetVault.signer);
    return this;
  }

  async setupRegistries(): Promise<this> {
    if (this.assetVault === undefined || this.assetClass === undefined) {
      throw new BuilderNotConfiguredError();
    }

    if (!(await this.assetClassRegistry.isRegisteredAssetClass(this.assetClass))) {
      await this.assetClassRegistry.registerAssetClass(this.assetClass, {
        controller: this.assetController.address,
        vault: this.assetVault.address,
      });
    }
    return this;
  }
}

export class UniverseHelper {
  public universeRegistrationParams?: IUniverseRegistry.UniverseParamsStruct = undefined;

  constructor(readonly universeRegistry: IUniverseRegistry) {}

  withUniverseRegistrationParams(universeRegistrationParams: IUniverseRegistry.UniverseParamsStruct): this {
    this.universeRegistrationParams = universeRegistrationParams;
    return this;
  }

  async setupUniverse(): Promise<ReturnType<typeof createUniverse>> {
    if (this.universeRegistrationParams === undefined) {
      throw new BuilderNotConfiguredError();
    }

    return createUniverse(this.universeRegistry, this.universeRegistrationParams);
  }
}

export class WarperHelper {
  constructor(
    readonly warperPresetFactory: IWarperPresetFactory,
    readonly metahub: IMetahub,
    readonly warperManager: IWarperManager,
    readonly presetId: BytesLike,
  ) {}

  async setupWarper(
    originalAsset: ERC721Mock,
    universeId: BigNumber,
    warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct,
  ): Promise<string> {
    const warperAddress = await deployWarperPreset(
      this.warperPresetFactory,
      this.presetId,
      this.metahub.address,
      originalAsset.address,
    );
    await this.warperManager.registerWarper(warperAddress, { ...warperRegistrationParams, universeId });
    return warperAddress;
  }
}

export class ListerHelper {
  public lister?: SignerWithAddress = undefined;
  public maxLockPeriod?: number = undefined;
  public immediatePayout?: boolean = undefined;
  public pricingStrategy?: ReturnType<typeof makeFixedPriceStrategy> = undefined;
  public asset?: {
    original: string;
    tokenId: BigNumberish;
    forMetahub: ReturnType<typeof makeERC721Asset>;
  } = undefined;

  constructor(readonly metahub: IMetahub, readonly listingManager: IListingManager) {}

  withFixedPriceStrategy(baseRate: number): this {
    this.pricingStrategy = makeFixedPriceStrategy(baseRate);
    return this;
  }

  withERC721Asset(originalAssetAddress: string, tokenId: BigNumberish): this {
    this.asset = {
      forMetahub: makeERC721Asset(originalAssetAddress, tokenId),
      original: originalAssetAddress,
      tokenId: tokenId,
    };
    return this;
  }

  withLister(lister: SignerWithAddress): this {
    this.lister = lister;
    return this;
  }

  withImmediatePayout(immediatePayout: boolean): this {
    this.immediatePayout = immediatePayout;
    return this;
  }

  withMaxLockPeriod(maxLockPeriod: number): this {
    this.maxLockPeriod = maxLockPeriod;
    return this;
  }

  async listAsset(): Promise<ReturnType<IListingManager['callStatic']['listAsset']>> {
    if (
      this.lister === undefined ||
      this.maxLockPeriod === undefined ||
      this.pricingStrategy === undefined ||
      this.asset === undefined ||
      this.immediatePayout === undefined
    ) {
      throw new BuilderNotConfiguredError();
    }

    await ERC721__factory.connect(this.asset.original, this.lister).setApprovalForAll(this.metahub.address, true);

    const returnData = await this.listingManager
      .connect(this.lister)
      .callStatic.listAsset(this.asset.forMetahub, this.pricingStrategy, this.maxLockPeriod, this.immediatePayout);

    await this.listingManager
      .connect(this.lister)
      .listAsset(this.asset.forMetahub, this.pricingStrategy, this.maxLockPeriod, this.immediatePayout);

    return returnData;
  }

  async listingGroupId(listingId: BigNumberish): Promise<BigNumber> {
    return (await this.listingManager.listingInfo(listingId)).groupId;
  }
}

export class AssetListerHelper {
  public static warperPresetId = PRESET_CONFIGURABLE_ID;

  constructor(
    readonly assetClassRegistry: IAssetClassRegistry,
    readonly assetController: string,
    readonly erc721assetVault: string,
    readonly listingManager: IListingManager,
    readonly metahub: IMetahub,
    readonly warperManager: IWarperManager,
    readonly universeRegistry: IUniverseRegistry,
    readonly warperPresetFactory: IWarperPresetFactory,
    readonly listingStrategyRegistry: IListingStrategyRegistry,
  ) {}

  async setupRegistries(): Promise<void> {
    if (!(await this.assetClassRegistry.isRegisteredAssetClass(ASSET_CLASS.ERC721))) {
      await this.assetClassRegistry.registerAssetClass(ASSET_CLASS.ERC721, {
        controller: this.assetController,
        vault: this.erc721assetVault,
      });
    }
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
    await this.warperManager.registerWarper(warperAddress, { ...warperRegistrationParams, universeId });
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

    const { listingId } = await this.listingManager
      .connect(lister)
      .callStatic.listAsset(asset, listingParams, maxLockPeriod, false);

    await this.listingManager.connect(lister).listAsset(asset, listingParams, maxLockPeriod, immediatePayout);

    return listingId;
  }

  async listingGroupId(listingId: BigNumberish): Promise<BigNumber> {
    return (await this.listingManager.listingInfo(listingId)).groupId;
  }
}
