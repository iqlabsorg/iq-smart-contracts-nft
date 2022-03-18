import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721AssetController, ERC721AssetController__factory, IAssetClassManager } from '../../../../typechain';
import { AddressZero } from '../../../shared/types';
import { AssetClass } from '../../../shared/utils';

/**
 * The metahub contract behaves like IAssetClassManager
 */
export function shouldBehaveLikeAssetClassManager(): void {
  describe('IAssetClassManager', function () {
    let metahub: IAssetClassManager;
    let deployer: SignerWithAddress;

    beforeEach(function () {
      deployer = this.signers.named['deployer'];
      metahub = this.contracts.metahub as unknown as IAssetClassManager;
    });

    describe('Asset Controller Management', () => {
      let erc721controller: ERC721AssetController;
      beforeEach(async () => {
        erc721controller = await new ERC721AssetController__factory(deployer).deploy();
      });

      describe('setAssetClassController', () => {
        it('allows to add asset class controller', async () => {
          await expect(metahub.setAssetClassController(AssetClass.ERC721, erc721controller.address))
            .to.emit(metahub, 'AssetClassControllerChanged')
            .withArgs(AssetClass.ERC721, erc721controller.address);
        });
      });

      describe('get assetClassConfig', () => {
        context('config exists', () => {
          beforeEach(async () => {
            await metahub.setAssetClassController(AssetClass.ERC721, erc721controller.address);
          });

          it('returns the config structure', async () => {
            await expect(metahub.assetClassConfig(AssetClass.ERC721)).to.eventually.equalStruct({
              controller: erc721controller.address,
              vault: AddressZero,
            });
          });
        });

        context('config does not exist', () => {
          it('returns empty fields', async () => {
            await expect(metahub.assetClassConfig(AssetClass.ERC721)).to.eventually.equalStruct({
              controller: AddressZero,
              vault: AddressZero,
            });
          });
        });
      });
    });
  });
}
