/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { formatBytes32String } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';
import {
  AssetClassRegistry,
  ERC20,
  ERC721Mock,
  IACL,
  IAssetController__factory,
  IERC721WarperController,
  IUniverseRegistry,
  IWarper,
  ListingStrategyRegistry,
  Metahub,
  WarperPresetFactory,
} from '../../../typechain';
import { shouldBehaveLikeMetahub } from './metahub.behaviour';

export const warperPresetId = formatBytes32String('ERC721Basic');

export function unitTestMetahub(): void {
  let acl: IACL;
  async function unitFixtureMetahub(): Promise<{
    assetClassRegistry: any;
    universeRegistry: IUniverseRegistry;
    fixedPriceListingController: any;
    originalAsset: ERC721Mock;
    erc721Controller: IERC721WarperController;
    erc721Vault: any;
    listingStrategyRegistry: any;
    warperPresetFactory: any;
    metahub: any;
    baseToken: any;
  }> {
    // Resolve primary roles
    const nftCreator = await ethers.getNamedSigner('nftCreator');

    // Deploy original NFT
    const originalAsset = (await hre.run('deploy:mock:ERC721', {
      name: 'Test ERC721',
      symbol: 'ONFT',
    })) as ERC721Mock;

    // Mint some NFT to deployer
    await originalAsset.mint(nftCreator.address, 1);
    await originalAsset.mint(nftCreator.address, 2);

    // Deploy and register warper preset
    const warperImpl = (await hre.run('deploy:erc721-preset-configurable')) as IWarper;

    const baseToken = (await hre.run('deploy:mock:ERC20', {
      name: 'Test ERC721',
      symbol: 'ONFT',
      decimals: 18,
      totalSupply: 100_000_000,
    })) as ERC20;

    // Deploy Asset Class Registry.
    const assetClassRegistry = (await hre.run('deploy:asset-class-registry', {
      acl: acl.address,
    })) as AssetClassRegistry;

    // Deploy Listing Strategy Registry
    const listingStrategyRegistry = (await hre.run('deploy:listing-strategy-registry', {
      acl: acl.address,
    })) as ListingStrategyRegistry;

    // Deploy Warper preset factory
    const warperPresetFactory = (await hre.run('deploy:warper-preset-factory', {
      acl: acl.address,
    })) as WarperPresetFactory;

    await warperPresetFactory.addPreset(warperPresetId, warperImpl.address);
    // Deploy Universe token
    const universeRegistry = (await hre.run('deploy:universe-registry', { acl: acl.address })) as IUniverseRegistry;

    const metahub = (await hre.run('deploy:metahub', {
      acl: acl.address,
      universeRegistry: universeRegistry.address,
      warperPresetFactory: warperPresetFactory.address,
      listingStrategyRegistry: listingStrategyRegistry.address,
      assetClassRegistry: assetClassRegistry.address,
      baseToken: baseToken.address,
      rentalFeePercent: 100,
    })) as Metahub;

    const erc721Controller = (await hre.run('deploy:erc721-warper-controller')) as IERC721WarperController;
    const erc721Vault = await hre.run('deploy:erc721-asset-vault', {
      operator: metahub.address,
      acl: acl.address,
    });

    const fixedPriceListingController = await hre.run('deploy:fixed-price-listing-controller');

    return {
      assetClassRegistry,
      universeRegistry,
      fixedPriceListingController,
      originalAsset,
      erc721Controller,
      erc721Vault,
      listingStrategyRegistry,
      warperPresetFactory,
      metahub,
      baseToken,
    };
  }

  describe('Metahub', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;

      const {
        metahub,
        originalAsset,
        universeRegistry,
        listingStrategyRegistry,
        warperPresetFactory,
        fixedPriceListingController,
        assetClassRegistry,
        erc721Controller,
        baseToken,
        erc721Vault,
      } = await this.loadFixture(unitFixtureMetahub);

      // Interfaces/Subclasses under test
      this.contracts.metahub = metahub;
      this.contracts.listingManager = metahub;
      this.contracts.rentingManager = metahub;
      this.contracts.warperManager = metahub;
      this.contracts.uupsUpgradeable = metahub;

      // Common dependencies
      this.contracts.listingStrategyRegistry = listingStrategyRegistry;
      this.contracts.erc721assetVault = erc721Vault;
      this.contracts.assetController = IAssetController__factory.connect(
        erc721Controller.address,
        erc721Controller.signer,
      );
      this.contracts.assetClassRegistry = assetClassRegistry;
      this.contracts.universeRegistry = universeRegistry;
      this.contracts.warperPresetFactory = warperPresetFactory;
      this.contracts.fixedPriceListingController = fixedPriceListingController;

      // Mocks
      this.mocks.assets.erc721 = originalAsset;
      this.mocks.assets.erc20 = baseToken;
    });

    shouldBehaveLikeMetahub();
  });
}
