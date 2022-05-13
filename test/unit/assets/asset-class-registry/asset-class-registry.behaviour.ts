import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721AssetController, ERC721AssetController__factory, IAssetClassRegistry } from '../../../../typechain';
import { ADDRESS_ZERO } from '../../../shared/types';
import { ASSET_CLASS } from '../../../../src';
import { AccessControlledHelper } from '../../../shared/utils';

/**
 * The assetClassRegistry contract behaves like IAssetClassRegistry
 */
export function shouldBehaveLikeAssetClassRegistry(): void {
  describe('IAssetClassRegistry', function () {
    let assetClassRegistry: IAssetClassRegistry;
    let deployer: SignerWithAddress;

    beforeEach(function () {
      deployer = this.signers.named.deployer;
      assetClassRegistry = this.contracts.assetClassRegistry;
    });

    describe('registerAssetClass', () => {
      context('When invalid asset controller', () => {
        it('reverts');
      });
      context('When invalid asset vault', () => {
        it('reverts');
      });
      context('Asset class already registered', () => {
        it('reverts');
      });

      context.skip('When called by stranger', () => {
        AccessControlledHelper.onlyAdminCan(async () => {
          const tx = await assetClassRegistry.registerAssetClass(ASSET_CLASS.ERC20, {
            // TODO invalid vault and controller
            vault: ADDRESS_ZERO,
            controller: ADDRESS_ZERO,
          });

          await expect(tx).to.emit(assetClassRegistry, 'AssetClassRegistered').withArgs(ASSET_CLASS.ERC721);
          await expect(assetClassRegistry.isRegisteredAssetClass(ASSET_CLASS.ERC20)).to.eventually.equal(true);
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
