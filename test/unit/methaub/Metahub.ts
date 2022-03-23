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
} from '../../../typechain';

import { shouldBehaveLikeMetahub } from './Metahub.behaviour';
import { wait } from '../../../tasks';

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

  // Deploy and register warper preset
  const warperImpl = await new ERC721PresetConfigurable__factory(deployer).deploy();
  const baseToken = await new ERC20Mock__factory(nftCreator).deploy('Stablecoin', 'STBL', 18, 100_000_000);

  const deployedACL = await hre.run('deploy:acl');

  // Deploy Asset Class Registry.
  // TODO move to a deploy script
  const assetClassRegistry = (await upgrades.deployProxy(new AssetClassRegistry__factory(deployer), [], {
    kind: 'uups',
    initializer: false,
  })) as AssetClassRegistry;
  await wait(assetClassRegistry.initialize(deployedACL));

  const deployedAddresses = await hre.run('deploy:metahub-family', {
    acl: deployedACL,
    assetClassRegistry: assetClassRegistry.address,
    baseToken: baseToken.address,
    rentalFeePercent: 100,
  });
  const acl = new ACL__factory(deployer).attach(deployedACL);
  const metahub = new Metahub__factory(deployer).attach(deployedAddresses.metahub);
  const universeToken = new UniverseToken__factory(deployer).attach(deployedAddresses.universeToken);
  const warperPresetFactory = new WarperPresetFactory__factory(deployer).attach(deployedAddresses.warperPresetFactory);
  await warperPresetFactory.addPreset(warperPresetId, warperImpl.address);

  return {
    assetClassRegistry,
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
      const { metahub, originalAsset, universeToken, warperPresetFactory, acl, assetClassRegistry } =
        await this.loadFixture(unitFixtureMetahub);
      this.mocks.assets.erc721 = originalAsset;
      this.contracts.metahub = metahub;
      this.contracts.assetClassRegistry = assetClassRegistry;
      this.contracts.universeToken = universeToken;
      this.contracts.warperPresetFactory = warperPresetFactory;
      this.contracts.acl = acl;
    });

    shouldBehaveLikeMetahub();
  });
}
