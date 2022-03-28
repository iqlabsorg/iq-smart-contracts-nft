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
  UniverseToken,
  AssetClassRegistry__factory,
  AssetClassRegistry,
  IListingManager,
  IACL,
  UUPSUpgradeable,
  IRentingManager,
  IUniverseManager,
  IWarperManager,
  IWarperPresetFactory,
  ERC721AssetController__factory,
  ERC721AssetVaultMock__factory,
  ListingStrategyRegistry__factory,
} from '../../../typechain';

import { shouldBehaveLikeMetahub } from './Metahub.behaviour';
import { wait } from '../../../tasks';

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
  // TODO move to a deploy script
  const assetClassRegistry = (await upgrades.deployProxy(new AssetClassRegistry__factory(deployer), [], {
    kind: 'uups',
    initializer: false,
  })) as AssetClassRegistry;
  await wait(assetClassRegistry.initialize(acl.address));

  // Deploy Listing Strategy Registry
  const listingStrategyRegistry = (await upgrades.deployProxy(
    new ListingStrategyRegistry__factory(deployer),
    [acl.address],
    {
      kind: 'uups',
      initializer: 'initialize(address)',
    },
  )) as AssetClassRegistry;

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

  // TODO use deploy tasks
  const erc721Controller = await new ERC721AssetController__factory(deployer).deploy();
  const erc721Vault = await new ERC721AssetVaultMock__factory(deployer).deploy();

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
        erc721Controller,
        erc721Vault,
        originalAsset,
        universeToken,
        warperPresetFactory,
        assetClassRegistry,
      } = await this.loadFixture(unitFixtureMetahub);

      this.contracts.assetClassRegistry = assetClassRegistry;
      this.listingManager = {
        underTest: metahub as unknown as IListingManager,
        erc721Controller: erc721Controller,
        erc721Vault: erc721Vault,
        originalAsset,
      };
      this.rentingManager = {
        underTest: metahub as unknown as IRentingManager,
      };
      this.universeManager = {
        underTest: metahub as unknown as IUniverseManager,
        universeToken,
      };
      this.warperManager = {
        underTest: metahub as unknown as IWarperManager,
        universeId: undefined, // NOTE: Overriden later as not to pollute the global setup
        originalAsset,
        warperPresetFactory: warperPresetFactory as unknown as IWarperPresetFactory,
      };
      this.uupsUpgradeable = {
        underTest: metahub as unknown as UUPSUpgradeable,
        acl: acl as unknown as IACL,
      };
    });

    shouldBehaveLikeMetahub();
  });
}
