import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721AssetController, ERC721AssetController__factory, IAssetClassRegistry } from '../../../../typechain';
import { ADDRESS_ZERO } from '../../../shared/types';
import { ASSET_CLASS } from '../../../shared/constants';

/**
 * The assetClassRegistry contract behaves like IAssetClassRegistry
 */
export function shouldBehaveLikeAssetClassRegistry(): void {
  describe('IAssetClassRegistry', function () {
    let assetClassRegistry: IAssetClassRegistry;
    let deployer: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(function () {
      deployer = this.signers.named.deployer;
      [stranger] = this.signers.unnamed;
      assetClassRegistry = this.contracts.assetClassRegistry;
    });

    describe('registerAssetClass', () => {
      context('When called by stranger', () => {
        it('reverts', async () => {
          await expect(
            assetClassRegistry.connect(stranger).registerAssetClass(ASSET_CLASS.ERC721, {
              vault: ADDRESS_ZERO,
              controller: ADDRESS_ZERO,
            }),
          ).to.be.reverted;
        });
      });
      context('When called by admin', () => {
        it('executes successfully', async () => {
          await expect(
            assetClassRegistry.registerAssetClass(ASSET_CLASS.ERC721, {
              vault: ADDRESS_ZERO,
              controller: ADDRESS_ZERO,
            }),
          ).to.not.be.reverted;
        });
      });
    });

    describe.skip('Asset Controller Management', () => {
      let erc721controller: ERC721AssetController;
      beforeEach(async () => {
        erc721controller = await new ERC721AssetController__factory(deployer).deploy();
      });

      describe('setAssetClassController', () => {
        it('allows to add asset class controller', async () => {
          await expect(assetClassRegistry.setAssetClassController(ASSET_CLASS.ERC721, erc721controller.address))
            .to.emit(assetClassRegistry, 'AssetClassControllerChanged')
            .withArgs(ASSET_CLASS.ERC721, erc721controller.address);
        });
      });

      describe('get assetClassConfig', () => {
        context('When config exists', () => {
          beforeEach(async () => {
            await assetClassRegistry.setAssetClassController(ASSET_CLASS.ERC721, erc721controller.address);
          });

          it('returns the config structure', async () => {
            await expect(assetClassRegistry.assetClassConfig(ASSET_CLASS.ERC721)).to.eventually.equalStruct({
              controller: erc721controller.address,
              vault: ADDRESS_ZERO,
            });
          });
        });

        context('When config does not exist', () => {
          it('returns empty fields', async () => {
            await expect(assetClassRegistry.assetClassConfig(ASSET_CLASS.ERC721)).to.eventually.equalStruct({
              controller: ADDRESS_ZERO,
              vault: ADDRESS_ZERO,
            });
          });
        });
      });
    });
  });
}
