import { IAssetController, Warper } from '../../../../typechain';
import { unitFixtureERC721AssetsController } from '../../../shared/fixtures';
import { shouldBehaveAssetController } from './assetController.behaviour';

export function unitTestAssetController(): void {
  describe('ERC721 Asset controller', function () {
    beforeEach(async function () {
      const { originalNft, erc721AssetController, warper } = await this.loadFixture(unitFixtureERC721AssetsController);

      this.mocks.assets.erc721 = originalNft;
      this.contracts.presets.warper = warper as unknown as Warper;
      this.contracts.assetController = erc721AssetController as unknown as IAssetController;
    });

    shouldBehaveAssetController();
  });
}
