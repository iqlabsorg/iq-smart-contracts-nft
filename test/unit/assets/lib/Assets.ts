import { ethers } from 'hardhat';
import { AssetsMock__factory } from '../../../../typechain';
import { shouldBehaveLikeAssetsLibrary } from './Assets.behaviour';

export async function unitFixtureAssetsLib() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  const assetsLib = await new AssetsMock__factory(deployer).deploy();

  return { assetsLib };
}

export function unitTestAssetsLibrary(): void {
  describe('Assets library', function () {
    beforeEach(async function () {
      const { assetsLib } = await this.loadFixture(unitFixtureAssetsLib);

      this.mocks.assetsLib = assetsLib;
    });

    shouldBehaveLikeAssetsLibrary();
  });
}
