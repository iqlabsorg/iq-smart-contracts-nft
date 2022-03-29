import hre, { ethers, upgrades } from 'hardhat';
import { wait } from '../../../../tasks';
import { AssetClassRegistry, AssetClassRegistry__factory, IAssetClassRegistry__factory } from '../../../../typechain';
import { shouldBehaveLikeAssetClassRegistry } from './AssetClassRegistry.behaviour';

async function unitFixtureAssetClassRegistry() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const deployedACL = await hre.run('deploy:acl');

  return {
    assetClassRegistry: new AssetClassRegistry__factory(deployer).attach(
      await hre.run('deploy:asset-class-registry', { acl: deployedACL }),
    ),
  };
}

export function unitTestAssetClassRegistry(): void {
  describe('Asset Class registry', function () {
    beforeEach(async function () {
      const { assetClassRegistry } = await this.loadFixture(unitFixtureAssetClassRegistry);
      this.contracts.assetClassRegistry = IAssetClassRegistry__factory.connect(
        assetClassRegistry.address,
        assetClassRegistry.signer,
      );
    });

    shouldBehaveLikeAssetClassRegistry();
  });
}
