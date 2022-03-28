import hre, { ethers, upgrades } from 'hardhat';
import { formatBytes32String } from 'ethers/lib/utils';
import {
  ERC20Mock__factory,
  ACL__factory,
  ERC721Mock__factory,
  ERC721PresetConfigurable__factory,
  Metahub__factory,
  UniverseToken__factory,
  WarperPresetFactory__factory,
  AssetClassRegistry__factory,
  ERC721AssetController__factory,
  ListingStrategyRegistry__factory,
  IListingManager__factory,
  IRentingManager__factory,
  IUniverseManager__factory,
  IWarperManager__factory,
  ERC721AssetVault__factory,
  UUPSUpgradeable__factory,
  AssetClassRegistry,
  ListingStrategyRegistry,
} from '../../../typechain';

import { shouldBehaveLikeMetahub } from './Metahub.behaviour';

export async function unitFixtureMetahub() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const nftCreator = await ethers.getNamedSigner('nftCreator');

  // Deploy original NFT
  const originalAsset = new ERC721Mock__factory(nftCreator).attach(
    await hre.run('deploy:mock:ERC721', {
      name: 'Test ERC721',
      symbol: 'ONFT',
    }),
  );

  // Mint some NFT to deployer
  await originalAsset.mint(nftCreator.address, 1);
  await originalAsset.mint(nftCreator.address, 2);

  // Deploy and register warper preset
  const warperImpl = new ERC721PresetConfigurable__factory(deployer).attach(
    await hre.run('deploy:erc721-preset-configurable'),
  );

  const baseToken = new ERC20Mock__factory(nftCreator).attach(
    await hre.run('deploy:mock:ERC20', {
      name: 'Test ERC721',
      symbol: 'ONFT',
      decimals: 18,
      totalSupply: 100_000_000,
    }),
  );

  const acl = new ACL__factory(deployer).attach(await hre.run('deploy:acl'));

  // Deploy Asset Class Registry.
  const assetClassRegistry = new AssetClassRegistry__factory(deployer).attach(
    await hre.run('deploy:asset-class-registry', { acl: acl.address }),
  );

  // Deploy Listing Strategy Registry
  const listingStrategyRegistry = new ListingStrategyRegistry__factory(deployer).attach(
    await hre.run('deploy:listing-strategy-registry', { acl: acl.address }),
  );

  const deployedAddresses = await hre.run('deploy:metahub-family', {
    acl: acl.address,
    listingStrategyRegistry: listingStrategyRegistry.address,
    assetClassRegistry: assetClassRegistry.address,
    baseToken: baseToken.address,
    rentalFeePercent: 100,
  });
  const metahub = new Metahub__factory(deployer).attach(deployedAddresses.metahub);
  const universeToken = new UniverseToken__factory(deployer).attach(deployedAddresses.universeToken);
  const warperPresetFactory = new WarperPresetFactory__factory(deployer).attach(deployedAddresses.warperPresetFactory);
  await warperPresetFactory.addPreset(warperPresetId, warperImpl.address);

  const erc721Controller = await new ERC721AssetController__factory(deployer).deploy();
  const erc721Vault = await new ERC721AssetVault__factory(deployer).deploy(metahub.address, acl.address);

  return {
    assetClassRegistry,
    universeToken,
    originalAsset,
    erc721Controller,
    erc721Vault,
    warperPresetFactory,
    metahub,
    acl,
  };
}
export const warperPresetId = formatBytes32String('ERC721Basic');

export function unitTestMetahub(): void {
  describe('Metahub', function () {
    beforeEach(async function () {
      const {
        acl,
        metahub,
        originalAsset,
        universeToken,
        warperPresetFactory,
        assetClassRegistry,
        erc721Controller,
        erc721Vault,
      } = await this.loadFixture(unitFixtureMetahub);

      // Interfaces/Subclasses under test
      this.interfaces.iListingManager = IListingManager__factory.connect(metahub.address, metahub.signer);
      this.interfaces.iRentingManager = IRentingManager__factory.connect(metahub.address, metahub.signer);
      this.interfaces.iUniverseManager = IUniverseManager__factory.connect(metahub.address, metahub.signer);
      this.interfaces.iWarperManager = IWarperManager__factory.connect(metahub.address, metahub.signer);
      this.contracts.uupsUpgradeable = UUPSUpgradeable__factory.connect(metahub.address, metahub.signer);

      // Common dependencies
      this.mocks.assets.erc721 = originalAsset;
      this.contracts.erc721assetVault = erc721Vault;
      this.contracts.erc721AssetController = erc721Controller;
      this.contracts.assetClassRegistry = assetClassRegistry;
      this.contracts.universeToken = universeToken;
      this.contracts.acl = acl;
      this.contracts.warperPresetFactory = warperPresetFactory;
    });

    shouldBehaveLikeMetahub();
  });
}
