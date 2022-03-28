import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721AssetVaultMock, ERC721Mock, IListingManager } from '../../../../typechain';
import { AssetClass, makeERC721Asset, makeFixedPriceStrategy } from '../../../shared/utils';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeListingManager(): void {
  describe('IListingManager', function () {
    let listingManager: IListingManager;
    let originalAsset: ERC721Mock;
    let erc721Vault: ERC721AssetVaultMock;

    let nftCreator: SignerWithAddress;

    beforeEach(async function () {
      listingManager = this.interfaces.iListingManager;
      originalAsset = this.mocks.assets.erc721;

      await this.contracts.assetClassRegistry.registerAssetClass(AssetClass.ERC721, {
        controller: this.contracts.erc721AssetController.address,
        vault: this.contracts.erc721assetVault.address,
      });
    });

    // TODO
    describe('listAsset', function () {
      it.skip('prevents listing asset without registered warper', async () => {
        const asset = makeERC721Asset('0x2B328CCD2d38ACBF7103b059a8EB94171C68f745', 1); // unregistered asset
        const params = makeFixedPriceStrategy(100);
        const maxLockPeriod = 86400;

        await expect(listingManager.listAsset(asset, params, maxLockPeriod)).to.eventually.revertedWithError(
          'AssetHasNoWarpers',
          asset,
        );
      });

      it.skip('emits correct events', async () => {
        const asset = makeERC721Asset(originalAsset.address, 1);
        const params = makeFixedPriceStrategy(100);
        const maxLockPeriod = 86400;

        await expect(listingManager.listAsset(asset, params, maxLockPeriod))
          .to.emit(listingManager, 'AssetListed')
          .withArgs(asset, 1);
      });

      it.skip('puts listed asset into vault', async () => {
        await originalAsset.connect(nftCreator).approve(listingManager.address, 1);
        const asset = makeERC721Asset(originalAsset.address, 1);
        const params = makeFixedPriceStrategy(100);
        const maxLockPeriod = 86400;

        await listingManager.connect(nftCreator).listAsset(asset, params, maxLockPeriod);

        await expect(originalAsset.ownerOf(1)).to.eventually.eq(erc721Vault.address);
      });
    });
  });
}
