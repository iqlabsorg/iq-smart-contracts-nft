import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import {
  ERC721,
  ERC721AssetController,
  ERC721AssetController__factory,
  ERC721AssetVaultMock,
  ERC721AssetVaultMock__factory,
  ERC721Mock,
  IListingManager,
  Metahub,
} from '../../../../typechain';
import { AssetClass, makeERC721Asset, makeFixedPriceStrategy } from '../../../shared/utils';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeListingManager(): void {
  describe('IListingManager', function () {
    let metahub: IListingManager;

    let erc721Vault: ERC721AssetVaultMock;
    let erc721Controller: ERC721AssetController;
    let originalAsset: ERC721Mock;

    let deployer: SignerWithAddress;
    let nftCreator: SignerWithAddress;

    beforeEach(async function () {
      deployer = this.signers.named['deployer'];
      nftCreator = this.signers.named['nftCreator'];

      erc721Controller = await new ERC721AssetController__factory(deployer).deploy();
      erc721Vault = await new ERC721AssetVaultMock__factory(deployer).deploy();

      await this.contracts.metahub.registerAssetClass(AssetClass.ERC721, {
        controller: erc721Controller.address,
        vault: erc721Vault.address,
      });

      originalAsset = this.mocks.assets.erc721;
      metahub = this.contracts.metahub as unknown as IListingManager;
    });

    describe('listAsset', function () {
      it.skip('prevents listing asset without registered warper', async () => {
        const asset = makeERC721Asset('0x2B328CCD2d38ACBF7103b059a8EB94171C68f745', 1); // unregistered asset
        const params = makeFixedPriceStrategy(100);
        const maxLockPeriod = 86400;

        await expect(metahub.listAsset(asset, params, maxLockPeriod)).to.eventually.revertedWithError(
          'AssetHasNoWarpers',
          asset,
        );
      });

      it.skip('emits correct events', async () => {
        const asset = makeERC721Asset(originalAsset.address, 1);
        const params = makeFixedPriceStrategy(100);
        const maxLockPeriod = 86400;

        await expect(metahub.listAsset(asset, params, maxLockPeriod))
          .to.emit(metahub, 'AssetListed')
          .withArgs(asset, 1);
      });

      it.skip('puts listed asset into vault', async () => {
        await originalAsset.connect(nftCreator).approve(metahub.address, 1);
        const asset = makeERC721Asset(originalAsset.address, 1);
        const params = makeFixedPriceStrategy(100);
        const maxLockPeriod = 86400;

        await metahub.connect(nftCreator).listAsset(asset, params, maxLockPeriod);

        await expect(originalAsset.ownerOf(1)).to.eventually.eq(erc721Vault.address);
      });
    });
  });
}
