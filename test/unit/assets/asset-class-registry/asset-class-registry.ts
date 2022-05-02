import hre from 'hardhat';
import { IACL, IAssetClassRegistry } from '../../../../typechain';
import { shouldBehaveLikeAssetClassRegistry } from './asset-class-registry.behaviour';

export function unitTestAssetClassRegistry(): void {
  let acl: IACL;

  async function unitFixtureAssetClassRegistry(): Promise<{ assetClassRegistry: IAssetClassRegistry }> {
    const assetClassRegistry = (await hre.run('deploy:asset-class-registry', {
      acl: acl.address,
    })) as IAssetClassRegistry;

    return {
      assetClassRegistry,
    };
  }

  describe('Asset Class registry', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;
      const { assetClassRegistry } = await this.loadFixture(unitFixtureAssetClassRegistry);

      this.contracts.assetClassRegistry = assetClassRegistry;
    });

    shouldBehaveLikeAssetClassRegistry();
  });
}
