import hre, { ethers, upgrades } from 'hardhat';
import { wait } from '../../../../tasks';
import { AssetClassRegistry, AssetClassRegistry__factory } from '../../../../typechain';
import { shouldBehaveLikeAssetClassRegistry } from './AssetClassRegistry.behaviour';

async function unitFixtureAssetClassRegistry() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const deployedACL = await hre.run('deploy:acl');

  // Deploy Asset Class Registry.
  // TODO move to a deploy script
  const assetClassRegistry = (await upgrades.deployProxy(new AssetClassRegistry__factory(deployer), [], {
    kind: 'uups',
    initializer: false,
  })) as AssetClassRegistry;
  await wait(assetClassRegistry.initialize(deployedACL));

  return { assetClassRegistry };
}

export function unitTestAssetClassRegistry(): void {
  describe('ERC721AssetVault', function () {
    beforeEach(async function () {
      const { assetClassRegistry } = await this.loadFixture(unitFixtureAssetClassRegistry);
      this.contracts.assetClassRegistry = assetClassRegistry;
    });

    shouldBehaveLikeAssetClassRegistry();
  });
}
