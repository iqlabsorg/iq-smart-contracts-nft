import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import {
  ERC721AssetController,
  ERC721AssetController__factory,
  IAssetClassRegistry,
  IERC721AssetVault,
} from '../../../../typechain';
import { ADDRESS_ZERO } from '../../../shared/types';
import { ASSET_CLASS } from '../../../../src';
import { AccessControlledHelper } from '../../../shared/utils';
import { MockContract, smock } from '@defi-wonderland/smock';

/**
 * The assetClassRegistry contract behaves like IAssetClassRegistry
 */
export function shouldBehaveLikeAssetClassRegistry(): void {
  describe.only('IAssetClassRegistry', function () {
    let assetClassRegistry: IAssetClassRegistry;
    let erc721assetVault: IERC721AssetVault;
    let deployer: SignerWithAddress;

    beforeEach(function () {
      deployer = this.signers.named.deployer;
      ({ assetClassRegistry, erc721assetVault } = this.contracts);
    });

    describe('registerAssetClass', () => {
      context('When controllers asset class does not match the provided asset class', () => {
        let misconfiguredAssetClassController: MockContract<ERC721AssetController>;

        beforeEach(async () => {
          const misconfiguredAssetClassControllerFactory = await smock.mock<ERC721AssetController__factory>(
            'ERC721AssetController',
            deployer,
          );
          misconfiguredAssetClassController = await misconfiguredAssetClassControllerFactory.deploy();
          misconfiguredAssetClassController.assetClass.returns(ASSET_CLASS.ERC20);
        });

        it('reverts', async () => {
          await expect(
            assetClassRegistry.registerAssetClass(ASSET_CLASS.ERC721, {
              controller: misconfiguredAssetClassController.address,
              vault: erc721assetVault.address,
            }),
          ).to.be.revertedWith(`AssetClassMismatch("${ASSET_CLASS.ERC20}", "${ASSET_CLASS.ERC721}")`);
        });
      });

      context('When controller does not implement IAssetController', () => {
        let misconfiguredAssetClassController: MockContract<ERC721AssetController>;

        beforeEach(async () => {
          const misconfiguredAssetClassControllerFactory = await smock.mock<ERC721AssetController__factory>(
            'ERC721AssetController',
            deployer,
          );
          misconfiguredAssetClassController = await misconfiguredAssetClassControllerFactory.deploy();
          misconfiguredAssetClassController.supportsInterface.returns(false);
        });

        it('reverts', async () => {
          await expect(
            assetClassRegistry.registerAssetClass(ASSET_CLASS.ERC721, {
              controller: misconfiguredAssetClassController.address,
              vault: erc721assetVault.address,
            }),
          ).to.be.revertedWith('InvalidAssetControllerInterface()');
        });
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
