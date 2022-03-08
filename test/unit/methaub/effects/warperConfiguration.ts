import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import {
  AssetClass,
  createUniverse,
  deployWarper,
  makeERC721Asset,
  makeFixedPriceStrategy,
} from '../../../shared/utils';
import {
  ERC721AssetController,
  ERC721AssetController__factory,
  ERC721AssetVaultMock,
  ERC721AssetVaultMock__factory,
  ERC721Mock,
  ERC721Mock__factory,
  Metahub,
} from '../../../../typechain';
import { AddressZero } from '../../../shared/types';
import { warperPresetId } from '../Metahub';

export function shouldBehaveWarperAndUniverseConfiguration(): void {
  describe('Warper & Universe configuration', function () {
    let metahub: Metahub;
    let originalAsset: ERC721Mock;

    let deployer: SignerWithAddress;
    let nftCreator: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(function () {
      metahub = this.contracts.metahub;
      originalAsset = this.mocks.assets.erc721;

      deployer = this.signers.named['deployer'];
      nftCreator = this.signers.named['nftCreator'];
      [stranger] = this.signers.unnamed;
    });

    describe('When Universe is created', () => {
      let universeId: BigNumber;

      beforeEach(async () => {
        universeId = await createUniverse(metahub, 'IQ Universe');
      });

      it.skip('allows to deploy a warper from preset', async () => {
        const warperAddress = await deployWarper(metahub, universeId, originalAsset.address, warperPresetId);
        // Use original asset interface with warper address.
        const warper = new ERC721Mock__factory(deployer).attach(warperAddress);
        await expect(warper.name()).to.eventually.eq('Test ERC721');
        await expect(warper.symbol()).to.eventually.eq('ONFT');
      });

      it('verifies universe ownership upon warper deployment', async () => {
        await expect(
          metahub.connect(stranger).deployWarper(universeId, originalAsset.address, warperPresetId),
        ).to.be.revertedWith('CallerIsNotUniverseOwner');
      });

      describe.skip('When warpers are deployed & registered', () => {
        let warperAddress1: string;
        let warperAddress2: string;
        beforeEach(async () => {
          warperAddress1 = await deployWarper(metahub, universeId, originalAsset.address, warperPresetId);
          warperAddress2 = await deployWarper(metahub, universeId, originalAsset.address, warperPresetId);
        });

        it('returns a list of warpers for universe', async () => {
          await expect(metahub.universeWarpers(universeId)).to.eventually.deep.eq([warperAddress1, warperAddress2]);
        });

        it('returns a list of warpers for original asset', async () => {
          await expect(metahub.assetWarpers(originalAsset.address)).to.eventually.deep.eq([
            warperAddress1,
            warperAddress2,
          ]);
        });

        describe('Asset Controller Management', () => {
          let erc721controller: ERC721AssetController;
          beforeEach(async () => {
            erc721controller = await new ERC721AssetController__factory(deployer).deploy();
          });

          it('allows to add asset class controller', async () => {
            await expect(metahub.setAssetClassController(AssetClass.ERC721, erc721controller.address))
              .to.emit(metahub, 'AssetClassControllerChanged')
              .withArgs(AssetClass.ERC721, AddressZero, erc721controller.address);
          });
        });

        describe('Listing', () => {
          let erc721Vault: ERC721AssetVaultMock;
          beforeEach(async () => {
            const erc721Controller = await new ERC721AssetController__factory(deployer).deploy();
            erc721Vault = await new ERC721AssetVaultMock__factory(deployer).deploy();

            await metahub.registerAssetClass(AssetClass.ERC721, {
              controller: erc721Controller.address,
              vault: erc721Vault.address,
            });
          });

          it.skip('prevents listing asset without registered warper', async () => {
            const params = {
              asset: makeERC721Asset('0x2B328CCD2d38ACBF7103b059a8EB94171C68f745', 1), // unregistered asset
              strategy: makeFixedPriceStrategy(100),
              maxLockPeriod: 86400,
            };

            await expect(metahub.listAsset(params)).to.revertedWithError('AssetHasNoWarpers', params.asset);
          });

          it.skip('emits correct events', async () => {
            const params = {
              asset: makeERC721Asset(originalAsset.address, 1),
              strategy: makeFixedPriceStrategy(100),
              maxLockPeriod: 86400,
            };

            await expect(metahub.listAsset(params)).to.emit(metahub, 'AssetListed').withArgs(params.asset, 1);
          });

          it('puts listed asset into vault', async () => {
            await originalAsset.connect(nftCreator).approve(metahub.address, 1);
            const params = {
              asset: makeERC721Asset(originalAsset.address, 1),
              strategy: makeFixedPriceStrategy(100),
              maxLockPeriod: 86400,
            };

            await metahub.connect(nftCreator).listAsset(params);

            await expect(originalAsset.ownerOf(1)).to.eventually.eq(erc721Vault.address);
          });
        });
      });
    });
  });
}
