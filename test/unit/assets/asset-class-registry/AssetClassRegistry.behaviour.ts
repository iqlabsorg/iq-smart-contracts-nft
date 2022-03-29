import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import {
  ERC721AssetController,
  ERC721AssetController__factory,
  IAssetClassRegistry,
  IAssetClassRegistry__factory,
} from '../../../../typechain';
import { AddressZero } from '../../../shared/types';
import { AssetClass } from '../../../shared/utils';

/**
 * The assetClassRegistry contract behaves like IAssetClassRegistry
 */
export function shouldBehaveLikeAssetClassRegistry(): void {
  describe('IAssetClassRegistry', function () {
    let assetClassRegistry: IAssetClassRegistry;
    let deployer: SignerWithAddress;

    beforeEach(function () {
      deployer = this.signers.named['deployer'];
      assetClassRegistry = this.contracts.assetClassRegistry;
    });

    describe('Asset Controller Management', () => {
      let erc721controller: ERC721AssetController;
      beforeEach(async () => {
        erc721controller = await new ERC721AssetController__factory(deployer).deploy();
      });

      describe('setAssetClassController', () => {
        it('allows to add asset class controller', async () => {
          await expect(assetClassRegistry.setAssetClassController(AssetClass.ERC721, erc721controller.address))
            .to.emit(assetClassRegistry, 'AssetClassControllerChanged')
            .withArgs(AssetClass.ERC721, erc721controller.address);
        });
      });

      describe('get assetClassConfig', () => {
        context('config exists', () => {
          beforeEach(async () => {
            await assetClassRegistry.setAssetClassController(AssetClass.ERC721, erc721controller.address);
          });

          it('returns the config structure', async () => {
            await expect(assetClassRegistry.assetClassConfig(AssetClass.ERC721)).to.eventually.equalStruct({
              controller: erc721controller.address,
              vault: AddressZero,
            });
          });
        });

        context('config does not exist', () => {
          it('returns empty fields', async () => {
            await expect(assetClassRegistry.assetClassConfig(AssetClass.ERC721)).to.eventually.equalStruct({
              controller: AddressZero,
              vault: AddressZero,
            });
          });
        });
      });
    });
  });
}
