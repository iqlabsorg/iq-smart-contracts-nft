/* eslint-disable @typescript-eslint/no-unused-vars */
import { ERC721, IAssetController, IWarper } from '../../../../../typechain';

export function shouldBehaveLikeIAssetTransferExecutor(): void {
  describe('IAssetTransferExecutor', function () {
    let warper: IWarper;
    let notWarper: ERC721;
    let assetController: IAssetController;

    beforeEach(function () {
      notWarper = this.mocks.assets.erc721 as unknown as ERC721;
      warper = this.contracts.warper;
      assetController = this.contracts.assetController;
    });

    describe('transfer', () => {
      it('todo');
    });
  });
}
