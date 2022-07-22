/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import hre, { ethers } from 'hardhat';
import { BigNumber, BigNumberish, BytesLike, ContractReceipt, ContractTransaction, Signer } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { defaultAbiCoder } from 'ethers/lib/utils';
import {
  ERC721,
  ERC721__factory,
  IACL,
  IAssetClassRegistry,
  IAssetVault,
  IAssetVault__factory,
  IListingManager,
  IMetahub,
  IUniverseRegistry,
  IWarperManager,
  IWarperPresetFactory,
  IWarperPreset__factory,
  WarperPresetFactory,
  IERC721AssetVault,
  IAssetController,
  ERC721AssetController,
  IAssetController__factory,
  IERC20,
  IWarper,
  IRentingManager,
  IWarper__factory,
} from '../../typechain';
import { ASSET_CLASS, makeERC721Asset, makeFixedPriceStrategy } from '../../src';
import { PRESET_CONFIGURABLE_ID } from '../../tasks/deployment';

export type WithTx<T> = Awaited<T> & { tx: ContractTransaction };

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

export class AssetRegistryHelper {
  public assetVault?: IAssetVault = undefined;
  public assetController?: IAssetController = undefined;
  public assetClass?: BytesLike = undefined;

  constructor(readonly assetClassRegistry: IAssetClassRegistry) {}

  withERC721ClassConfig(erc721assetVault: IERC721AssetVault, assetController: ERC721AssetController): this {
    this.assetClass = ASSET_CLASS.ERC721;
    this.assetVault = IAssetVault__factory.connect(erc721assetVault.address, erc721assetVault.signer);
    this.assetController = IAssetController__factory.connect(assetController.address, assetController.signer);
    return this;
  }

  async registerAssetClasses(): Promise<{ tx: ContractTransaction } | undefined> {
    if (this.assetVault === undefined || this.assetClass === undefined || this.assetController === undefined) {
      throw new BuilderNotConfiguredError();
    }

    if (!(await this.assetClassRegistry.isRegisteredAssetClass(this.assetClass))) {
      return {
        tx: await this.assetClassRegistry.registerAssetClass(this.assetClass, {
          controller: this.assetController.address,
          vault: this.assetVault.address,
        }),
      };
    }
    return undefined;
  }
}

export class UniverseHelper {
  public universeRegistrationParams?: IUniverseRegistry.UniverseParamsStruct = undefined;

  constructor(readonly universeRegistry: IUniverseRegistry) {}

  async create(
    universeRegistrationParams: IUniverseRegistry.UniverseParamsStruct,
  ): Promise<WithTx<{ universeId: Awaited<ReturnType<IUniverseRegistry['callStatic']['createUniverse']>> }>> {
    const result = await this.universeRegistry.callStatic.createUniverse(universeRegistrationParams);
    const tx = await this.universeRegistry.createUniverse(universeRegistrationParams);
    return { tx, universeId: result };
  }
}

export class WarperHelper {
  public warperPresetId?: BytesLike;
  public initData?: BytesLike;

  constructor(
    readonly warperPresetFactory: IWarperPresetFactory,
    readonly metahub: IMetahub,
    readonly warperManager: IWarperManager,
  ) {}

  withConfigurableWarperPreset(): this {
    this.warperPresetId = PRESET_CONFIGURABLE_ID;
    return this;
  }

  withInitData(initData: BytesLike): this {
    this.initData = initData;
    return this;
  }

  async deployPreset(
    originalAsset: ERC721,
  ): Promise<WithTx<{ warperAddress: Awaited<ReturnType<IWarperPresetFactory['callStatic']['deployPreset']>> }>> {
    if (this.warperPresetId === undefined) {
      throw new BuilderNotConfiguredError();
    }

    let localInitData = this.initData;
    if (localInitData === undefined) {
      localInitData = IWarperPreset__factory.createInterface().encodeFunctionData('__initialize', [
        defaultAbiCoder.encode(['address', 'address'], [originalAsset.address, this.metahub.address]),
      ]);
    }

    const result = await this.warperPresetFactory.callStatic.deployPreset(this.warperPresetId, localInitData);
    const tx = await this.warperPresetFactory.deployPreset(this.warperPresetId, localInitData);
    return { warperAddress: result, tx };
  }

  async registerWarper(
    warper: IWarper,
    warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct,
  ): Promise<ContractTransaction> {
    await this.warperManager.callStatic.registerWarper(warper.address, warperRegistrationParams);
    return this.warperManager.registerWarper(warper.address, warperRegistrationParams);
  }

  async deployAndRegister(
    originalAsset: ERC721,
    warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct,
  ): Promise<IWarper> {
    const { warperAddress } = await this.deployPreset(originalAsset);
    const warper = IWarper__factory.connect(warperAddress, originalAsset.signer);
    await this.registerWarper(IWarper__factory.connect(warperAddress, originalAsset.signer), warperRegistrationParams);

    return warper;
  }
}

export class ListingHelper {
  public lister?: SignerWithAddress = undefined;
  public maxLockPeriod?: number = undefined;
  public immediatePayout?: boolean = undefined;
  public listingStrategyParams?: ReturnType<typeof makeFixedPriceStrategy> = undefined;
  public asset?: {
    token: string;
    asset: ReturnType<typeof makeERC721Asset>;
  } = undefined;

  constructor(readonly listingManager: IListingManager) {}

  withFixedPriceListingStrategy(baseRate: number): this {
    this.listingStrategyParams = makeFixedPriceStrategy(baseRate);
    return this;
  }

  withERC721Asset(token: string, tokenId: BigNumberish): this {
    this.asset = {
      asset: makeERC721Asset(token, tokenId),
      token: token,
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

  async listAsset(): Promise<WithTx<ReturnType<IListingManager['callStatic']['listAsset']>>> {
    if (
      this.lister === undefined ||
      this.maxLockPeriod === undefined ||
      this.listingStrategyParams === undefined ||
      this.asset === undefined ||
      this.immediatePayout === undefined
    ) {
      throw new BuilderNotConfiguredError();
    }

    await ERC721__factory.connect(this.asset.token, this.lister).setApprovalForAll(this.listingManager.address, true);

    const returnData = (await this.listingManager.connect(this.lister).callStatic.listAsset(
      this.asset.asset,
      this.listingStrategyParams,
      this.maxLockPeriod,
      this.immediatePayout,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;

    const tx = await this.listingManager
      .connect(this.lister)
      .listAsset(this.asset.asset, this.listingStrategyParams, this.maxLockPeriod, this.immediatePayout);

    return { tx, ...returnData };
  }

  async listingGroupId(listingId: BigNumberish): Promise<BigNumber> {
    return (await this.listingManager.listingInfo(listingId)).groupId;
  }
}

export class RentingHelper {
  public renter?: SignerWithAddress = undefined;
  public maxPaymentAmount?: BigNumberish = undefined;
  public paymentToken?: IERC20 = undefined;
  public warper?: IWarper = undefined;
  public rentalPeriod?: BigNumberish = undefined;

  constructor(readonly rentingManager: IRentingManager) {}

  withPaymentToken(paymentToken: IERC20): this {
    this.paymentToken = paymentToken;
    return this;
  }

  withWarper(warper: IWarper): this {
    this.warper = warper;
    return this;
  }

  withRenter(renter: SignerWithAddress): this {
    this.renter = renter;
    return this;
  }
  withMaxPaymentAmount(maxPaymentAmount: BigNumberish): this {
    this.maxPaymentAmount = maxPaymentAmount;
    return this;
  }
  withRentalPeriod(rentalPeriod: BigNumberish): this {
    this.rentalPeriod = rentalPeriod;
    return this;
  }

  async rent(listingId: BigNumberish): Promise<WithTx<ReturnType<IRentingManager['callStatic']['rent']>>> {
    if (
      this.paymentToken === undefined ||
      this.renter === undefined ||
      this.maxPaymentAmount === undefined ||
      this.rentalPeriod === undefined ||
      this.warper === undefined
    ) {
      throw new BuilderNotConfiguredError();
    }

    await this.paymentToken.connect(this.renter).approve(this.rentingManager.address, this.maxPaymentAmount);

    const rentingParams = {
      listingId: listingId,
      paymentToken: this.paymentToken.address,
      rentalPeriod: this.rentalPeriod,
      renter: this.renter.address,
      warper: this.warper.address,
    };
    const result = (await this.rentingManager
      .connect(this.renter)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .callStatic.rent(rentingParams, this.maxPaymentAmount)) as any;
    const tx = await this.rentingManager.connect(this.renter).rent(rentingParams, this.maxPaymentAmount);

    return { tx, ...result };
  }
}
