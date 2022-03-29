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

    //todo: move to WarperController test
    //describe('isCompatibleWarper', function () {
    //  describe('Item implements Warper interface', () => {
    //    it('returns true', async () => {
    //      await expect(assetController.isCompatibleWarper(warper.address)).to.eventually.equal(true);
    //    });
    //  });
    //
    //  describe('Item does not implement Warper interface', () => {
    //    it('returns false', async () => {
    //      await expect(assetController.isCompatibleWarper(notWarper.address)).to.eventually.equal(false);
    //    });
    //  });
    //});
  });
}
