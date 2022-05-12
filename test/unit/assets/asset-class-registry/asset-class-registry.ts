/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import hre, { ethers } from 'hardhat';
import { IACL } from '../../../../typechain';
import { shouldBehaveLikeAssetClassRegistry } from './asset-class-registry.behaviour';

export function unitTestAssetClassRegistry(): void {
  let acl: IACL;

  async function unitFixtureAssetClassRegistry(): Promise<{ assetClassRegistry: any; erc721assetVault: any }> {
    // Resolve primary roles
    const operator = await ethers.getNamedSigner('operator');

    const assetClassRegistry = await hre.run('deploy:asset-class-registry', {
      acl: acl.address,
    });
    const erc721assetVault = await hre.run('deploy:erc721-asset-vault', {
      acl: acl.address,
      operator: operator.address,
    });

    return {
      assetClassRegistry,
      erc721assetVault,
    };
  }

  describe('Asset Class registry', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;
      const { assetClassRegistry, erc721assetVault } = await this.loadFixture(unitFixtureAssetClassRegistry);

      this.contracts.assetClassRegistry = assetClassRegistry;
      this.contracts.erc721assetVault = erc721assetVault;
    });

    shouldBehaveLikeAssetClassRegistry();
  });
}
