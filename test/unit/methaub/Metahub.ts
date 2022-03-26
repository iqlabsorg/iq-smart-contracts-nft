import { formatBytes32String } from 'ethers/lib/utils';
import { ethers, upgrades } from 'hardhat';
import {
  ERC20Mock__factory,
  ACL__factory,
  ERC721Mock__factory,
  ERC721PresetConfigurable__factory,
  Metahub,
  Metahub__factory,
  UniverseToken__factory,
  WarperPresetFactory__factory,
  UniverseToken,
  AssetClassRegistry__factory,
  AssetClassRegistry,
} from '../../../typechain';
import { wait } from '../../shared/utils';

import { shouldBehaveLikeMetahub } from './Metahub.behaviour';

export async function unitFixtureMetahub() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const nftCreator = await ethers.getNamedSigner('nftCreator');

  // Deploy original NFT
  const erc721Factory = new ERC721Mock__factory(nftCreator);
  const originalAsset = await erc721Factory.deploy('Test ERC721', 'ONFT');
  await originalAsset.deployed();

  // Mint some NFT to deployer
  await originalAsset.mint(nftCreator.address, 1);
  await originalAsset.mint(nftCreator.address, 2);

  // Deploy warper preset factory
  const warperPresetFactory = await new WarperPresetFactory__factory(deployer).deploy();

  // Deploy and register warper preset
  const warperImpl = await new ERC721PresetConfigurable__factory(deployer).deploy();
  await warperPresetFactory.addPreset(warperPresetId, warperImpl.address);

  // Deploy ACL
  const acl = await new ACL__factory(deployer).deploy();

  // Deploy Asset Class Registry.
  const assetClassRegistry = (await upgrades.deployProxy(new AssetClassRegistry__factory(deployer), [acl.address], {
    kind: 'uups',
    initializer: 'intialize(address)',
  })) as AssetClassRegistry;

  // Deploy Metahub
  const metahub = (await upgrades.deployProxy(new Metahub__factory(deployer), [], {
    kind: 'uups',
    initializer: false,
    unsafeAllow: ['delegatecall'],
  })) as Metahub;

  // Deploy Universe token.
  const baseToken = await new ERC20Mock__factory(nftCreator).deploy('Stablecoin', 'STBL', 18, 100_000_000);
  const universeToken = (await upgrades.deployProxy(new UniverseToken__factory(deployer), [], {
    kind: 'uups',
    initializer: false,
    unsafeAllow: ['delegatecall'],
  })) as UniverseToken;

  // Initialize Universe token.
  await wait(universeToken.initialize(metahub.address, acl.address));

  // Initialize Metahub.
  await wait(
    metahub.initialize({
      warperPresetFactory: warperPresetFactory.address,
      assetClassRegistry: assetClassRegistry.address,
      universeToken: universeToken.address,
      acl: acl.address,
      baseToken: baseToken.address,
      rentalFeePercent: 100,
    }),
  );

  return {
    universeToken,
    originalAsset,
    warperPresetFactory,
    metahub,
    acl,
  };
}
export const warperPresetId = formatBytes32String('ERC721Basic');

export function unitTestMetahub(): void {
  describe('Metahub', function () {
    beforeEach(async function () {
      const { metahub, originalAsset, universeToken, warperPresetFactory, acl } = await this.loadFixture(
        unitFixtureMetahub,
      );
      this.mocks.assets.erc721 = originalAsset;
      this.contracts.metahub = metahub;
      this.contracts.universeToken = universeToken;
      this.contracts.warperPresetFactory = warperPresetFactory;
      this.contracts.acl = acl;
    });

    shouldBehaveLikeMetahub();
  });
}
