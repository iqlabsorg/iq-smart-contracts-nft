import hre, { ethers } from 'hardhat';
import { AssetClassRegistry__factory, IACL, IAssetClassRegistry__factory } from '../../../../typechain';
import { shouldBehaveLikeAssetClassRegistry } from './AssetClassRegistry.behaviour';

export function unitTestAssetClassRegistry(): void {
  let acl: IACL;

  async function unitFixtureAssetClassRegistry() {
    // Resolve primary roles
    const deployer = await ethers.getNamedSigner('deployer');

    return {
      assetClassRegistry: new AssetClassRegistry__factory(deployer).attach(
        await hre.run('deploy:asset-class-registry', { acl: acl.address }),
      ),
    };
  }

  describe('Asset Class registry', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;
      const { assetClassRegistry } = await this.loadFixture(unitFixtureAssetClassRegistry);

      this.contracts.assetClassRegistry = IAssetClassRegistry__factory.connect(
        assetClassRegistry.address,
        assetClassRegistry.signer,
      );
    });

    shouldBehaveLikeAssetClassRegistry();
  });
}
