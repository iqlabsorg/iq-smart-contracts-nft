import { formatBytes32String } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';
import {
  ERC20Mock,
  ERC721Mock,
  ERC721PresetConfigurable,
  FixedPriceListingController,
  IACL,
  IAssetClassRegistry,
  IAssetController__factory,
  IERC721AssetVault,
  IERC721WarperController,
  IListingManager__factory,
  IListingStrategyRegistry,
  IMetahub,
  IRentingManager__factory,
  IUniverseRegistry,
  IWarperManager__factory,
  IWarperPresetFactory,
  UUPSUpgradeable__factory,
} from '../../../typechain';
import { shouldBehaveLikeMetahub } from './Metahub.behaviour';

export const warperPresetId = formatBytes32String('ERC721Basic');

export function unitTestMetahub(): void {
  let acl: IACL;
  async function unitFixtureMetahub() {
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
    const warperImpl = (await hre.run('deploy:erc721-preset-configurable')) as ERC721PresetConfigurable;

    const baseToken = (await hre.run('deploy:mock:ERC20', {
      name: 'Test ERC721',
      symbol: 'ONFT',
      decimals: 18,
      totalSupply: 100_000_000,
    })) as ERC20Mock;

    // Deploy Asset Class Registry.
    const assetClassRegistry = (await hre.run('deploy:asset-class-registry', {
      acl: acl.address,
    })) as IAssetClassRegistry;

    // Deploy Listing Strategy Registry
    const listingStrategyRegistry = (await hre.run('deploy:listing-strategy-registry', {
      acl: acl.address,
    })) as IListingStrategyRegistry;

    // Deploy Warper preset factory
    const warperPresetFactory = (await hre.run('deploy:warper-preset-factory', {
      acl: acl.address,
    })) as IWarperPresetFactory;

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
    })) as IMetahub;

    const erc721Controller = (await hre.run('deploy:erc721-warper-controller')) as IERC721WarperController;
    const erc721Vault = (await hre.run('deploy:erc721-asset-vault', {
      operator: metahub.address,
      acl: acl.address,
    })) as IERC721AssetVault;

    const fixedPriceListingController = (await hre.run(
      'deploy:fixed-price-listing-controller',
    )) as FixedPriceListingController;

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
      this.contracts.listingManager = IListingManager__factory.connect(metahub.address, metahub.signer);
      this.contracts.rentingManager = IRentingManager__factory.connect(metahub.address, metahub.signer);
      this.contracts.warperManager = IWarperManager__factory.connect(metahub.address, metahub.signer);
      this.contracts.uupsUpgradeable = UUPSUpgradeable__factory.connect(metahub.address, metahub.signer);

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
