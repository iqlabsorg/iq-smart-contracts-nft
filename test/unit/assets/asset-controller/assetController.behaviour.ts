/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect } from 'chai';
import { ERC721, IAssetController, Warper } from '../../../../typechain';

export function shouldBehaveLikeIAssetController(): void {
  describe('IAssetController', function () {
    let warper: Warper;
    let notWarper: ERC721;
    let assetController: IAssetController;

    beforeEach(function () {
      notWarper = this.mocks.assets.erc721 as unknown as ERC721;
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
