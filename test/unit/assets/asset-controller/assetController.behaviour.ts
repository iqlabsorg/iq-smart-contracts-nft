/* eslint-disable @typescript-eslint/no-unused-vars */
import { ERC721Mock, IAssetController, IWarper } from '../../../../typechain';

export function shouldBehaveLikeIAssetController(): void {
  describe('IAssetController', function () {
    let warper: IWarper;
    let notWarper: ERC721Mock;
    let assetController: IAssetController;

    beforeEach(function () {
      notWarper = this.mocks.assets.erc721;
      warper = this.contracts.warper;
      assetController = this.contracts.assetController;
    });

    describe('assetClass', () => {
      it('todo');
    });

    describe('transferAssetToVault', () => {
      it('todo');
    });

    describe('returnAssetFromVault', () => {
      it('todo');
    });

    describe('getToken', () => {
      it('todo');
    });
  });
}
