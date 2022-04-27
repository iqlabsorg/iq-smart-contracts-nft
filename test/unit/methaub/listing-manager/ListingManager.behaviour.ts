import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import {
  ERC20Mock,
  ERC721Mock,
  FixedPriceListingController,
  IAssetClassRegistry,
  IAssetController,
  IERC721AssetVault,
  IListingManager,
  IListingStrategyRegistry,
  IMetahub,
  IUniverseRegistry,
  IWarperManager,
  IWarperPresetFactory,
} from '../../../../typechain';
import { Assets, Listings } from '../../../../typechain/contracts/metahub/Metahub';
import { AddressZero } from '../../../shared/types';
import {
  AssetListerHelper,
  deployRandomERC721Token,
  makeERC721Asset,
  makeFixedPriceStrategy,
  solidityId,
} from '../../../shared/utils';

const universeRegistrationParams = {
  name: 'IQ Universe',
  rentalFeePercent: 1000,
};

const warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct = {
  name: 'Warper',
  universeId: 1,
  paused: true,
};

const maxLockPeriod = 86400;
const baseRate = 100;
const tokenId = BigNumber.from(1);
const maxPaymentAmount = 100_000_000;

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeListingManager(): void {
  describe('IListingManager', function () {
    let listingManager: IListingManager;
    let originalAsset: ERC721Mock;
    let metahub: IMetahub;
    let erc721assetVault: IERC721AssetVault;
    let assetClassRegistry: IAssetClassRegistry;
    let assetController: IAssetController;
    let universeRegistry: IUniverseRegistry;
    let warperPresetFactory: IWarperPresetFactory;
    let listingStrategyRegistry: IListingStrategyRegistry;
    let fixedPriceListingController: FixedPriceListingController;
    let paymentToken: ERC20Mock;

    let universeId: BigNumber;
    let warperAddress: string;

    let nftCreator: SignerWithAddress;
    let stranger: SignerWithAddress;
    let assetListerHelper: AssetListerHelper;

    beforeEach(async function () {
      ({
        listingManager,
        metahub,
        fixedPriceListingController,
        erc721assetVault,
        assetController,
        universeRegistry,
        assetClassRegistry,
        warperPresetFactory,
        listingStrategyRegistry,
      } = this.contracts);
      originalAsset = this.mocks.assets.erc721;
      paymentToken = this.mocks.assets.erc20;

      nftCreator = this.signers.named.nftCreator;
      [stranger] = this.signers.unnamed;

      assetListerHelper = new AssetListerHelper(
        nftCreator,
        assetClassRegistry,
        assetController.address,
        erc721assetVault.address,
        listingManager,
        metahub,
        universeRegistry,
        warperPresetFactory,
        listingStrategyRegistry,
        fixedPriceListingController,
      );

      await assetListerHelper.setupRegistries();
      universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
      warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
      await originalAsset.connect(nftCreator).setApprovalForAll(metahub.address, true);
    });

    describe('listAsset', () => {
      context('When warper is registered', () => {
        let asset: Assets.AssetStruct;
        let params: Listings.ParamsStruct;
        let maxLockPeriod: number;

        beforeEach(() => {
          // Test setup
          asset = makeERC721Asset(originalAsset.address, 1);
          params = makeFixedPriceStrategy(100);
          maxLockPeriod = 86400;
        });

        it('returns the expected event', async () => {
          // Execute tx
          const tx = await listingManager.connect(nftCreator).listAsset(asset, params, maxLockPeriod, false);
          const receipt = await tx.wait();

          // Assert
          const events = await listingManager.queryFilter(listingManager.filters.AssetListed(), receipt.blockNumber);
          const assetListed = events[0].args;
          await expect(tx).to.emit(listingManager, 'AssetListed');
          expect(assetListed).to.equalStruct({
            asset: asset,
            lister: nftCreator.address,
            listingId: BigNumber.from(1),
            maxLockPeriod: maxLockPeriod,
            params: params,
          });
        });

        it('transfers asset to vault', async () => {
          // Execute tx
          await listingManager.connect(nftCreator).listAsset(asset, params, maxLockPeriod, false);

          // Assert
          await expect(originalAsset.ownerOf(1)).to.eventually.equal(erc721assetVault.address);
        });

        context('When listing strategy not supported', () => {
          it('reverts', async () => {
            const fakeStrategy = solidityId('FAKE_STRATEGY');
            const alteredParams = { ...params, strategy: fakeStrategy };

            await expect(
              listingManager.connect(nftCreator).listAsset(asset, alteredParams, maxLockPeriod, false),
            ).to.be.revertedWith(`UnsupportedListingStrategy("${fakeStrategy}")`);
          });
        });

        context('When warper asset not supported', () => {
          it('reverts', async () => {
            const tokenData = await deployRandomERC721Token();
            const unknownAsset = makeERC721Asset(tokenData.address, 1);
            await expect(
              listingManager.connect(nftCreator).listAsset(unknownAsset, params, maxLockPeriod, false),
            ).to.be.revertedWith(`UnsupportedAsset("${tokenData.address}")`);
          });
        });
      });
    });

    describe('delistAsset', () => {
      context('When asset not listed', () => {
        it('reverts', async () => {
          const listingId = 3;
          await expect(listingManager.connect(nftCreator).delistAsset(listingId)).to.be.revertedWith(
            `NotListed(${listingId})`,
          );
        });
      });

      context('When asset listed', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(originalAsset, maxLockPeriod, baseRate, tokenId, false);
        });

        context('When called by non-lister', () => {
          it('reverts', async () => {
            await expect(listingManager.connect(stranger).delistAsset(listingId)).to.be.revertedWith(
              `CallerIsNotAssetLister()`,
            );
          });
        });

        it('emits an event', async () => {
          await expect(listingManager.connect(nftCreator).delistAsset(listingId))
            .to.emit(metahub, 'AssetDelisted')
            .withArgs(listingId, nftCreator.address, 0);
        });

        it('updates the listing', async () => {
          await listingManager.connect(nftCreator).delistAsset(listingId);

          const asset = makeERC721Asset(originalAsset.address, tokenId);
          const listingParams = makeFixedPriceStrategy(baseRate);

          await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct({
            asset: asset,
            params: listingParams,
            lister: nftCreator.address,
            maxLockPeriod: maxLockPeriod,
            lockedTill: 0,
            immediatePayout: false,
            delisted: true,
            paused: false,
          });
        });
      });
    });

    describe('withdrawAsset', () => {
      context('caller not lister', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(originalAsset, maxLockPeriod, baseRate, tokenId, false);
        });

        it('reverts', async () => {
          await expect(listingManager.connect(stranger).withdrawAsset(listingId)).to.be.revertedWith(
            'CallerIsNotAssetLister()',
          );
        });
      });

      context('Asset is locked', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(originalAsset, maxLockPeriod, baseRate, tokenId, false);

          const rentingParams1 = {
            listingId: listingId,
            paymentToken: paymentToken.address,
            rentalPeriod: 300,
            renter: stranger.address,
            warper: warperAddress,
          };
          await metahub.unpauseWarper(warperAddress);
          await paymentToken.mint(stranger.address, maxPaymentAmount);
          await paymentToken.connect(stranger).approve(metahub.address, maxPaymentAmount);
          await metahub.connect(stranger).rent(rentingParams1, maxPaymentAmount);
        });

        it('reverts', async () => {
          await expect(listingManager.connect(nftCreator).withdrawAsset(listingId)).to.be.revertedWith(
            'AssetIsLocked()',
          );
        });
      });

      context('Successfully withdraw asset', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(originalAsset, maxLockPeriod, baseRate, tokenId, false);
        });

        it('deletes the listing record', async () => {
          const asset = {
            id: { class: '0x00000000', data: '0x' },
            value: BigNumber.from(0),
          };
          const listingParams = { strategy: '0x00000000', data: '0x' };

          await listingManager.connect(nftCreator).withdrawAsset(listingId);

          await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct({
            asset: asset,
            params: listingParams,
            lister: AddressZero,
            maxLockPeriod: 0,
            lockedTill: 0,
            immediatePayout: false,
            delisted: false,
            paused: false,
          });
        });

        it('transfers the asset back to the lister', async () => {
          await listingManager.connect(nftCreator).withdrawAsset(listingId);

          await expect(originalAsset.ownerOf(1)).to.eventually.equal(nftCreator.address);
        });

        it('emits and event', async () => {
          const tx = await listingManager.connect(nftCreator).withdrawAsset(listingId);
          const receipt = await tx.wait();

          const events = await listingManager.queryFilter(listingManager.filters.AssetWithdrawn(), receipt.blockNumber);
          const assetListed = events[0].args;
          await expect(tx).to.emit(listingManager, 'AssetWithdrawn');
          const asset = makeERC721Asset(originalAsset.address, tokenId);

          expect(assetListed).to.equalStruct({
            asset: asset,
            lister: nftCreator.address,
            listingId: BigNumber.from(1),
          });
        });
      });
    });

    describe('pauseListing', () => {
      context('When listing is does not exist', () => {
        it('reverts', async () => {
          const listingId = 3;
          await expect(listingManager.connect(nftCreator).pauseListing(listingId)).to.be.revertedWith(
            `NotListed(${listingId})`,
          );
        });
      });

      context('When caller is not the lister', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(originalAsset, maxLockPeriod, baseRate, tokenId, false);
        });

        it('reverts', async () => {
          await expect(listingManager.connect(stranger).pauseListing(listingId)).to.be.revertedWith(
            'CallerIsNotAssetLister()',
          );
        });
      });

      context('When asset already paused', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(originalAsset, maxLockPeriod, baseRate, tokenId, false);
          await listingManager.connect(nftCreator).pauseListing(listingId);
        });

        it('reverts', async () => {
          await expect(listingManager.connect(nftCreator).pauseListing(listingId)).to.be.revertedWith(
            'ListingIsPaused()',
          );
        });
      });

      context('When successfully paused', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(originalAsset, maxLockPeriod, baseRate, tokenId, false);
        });

        it('emits an event', async () => {
          const tx = await listingManager.connect(nftCreator).pauseListing(listingId);

          await expect(tx).to.emit(listingManager, 'ListingPaused').withArgs(listingId);
        });

        it('pauses the listing', async () => {
          await listingManager.connect(nftCreator).pauseListing(listingId);

          const asset = makeERC721Asset(originalAsset.address, tokenId);
          const listingParams = makeFixedPriceStrategy(baseRate);

          await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct({
            asset: asset,
            params: listingParams,
            lister: nftCreator.address,
            maxLockPeriod: maxLockPeriod,
            lockedTill: 0,
            immediatePayout: false,
            delisted: false,
            paused: true,
          });
        });
      });
    });

    describe('unpauseListing', () => {
      context('When listing is does not exist', () => {
        it('reverts', async () => {
          const listingId = 3;
          await expect(listingManager.connect(nftCreator).unpauseListing(listingId)).to.be.revertedWith(
            `NotListed(${listingId})`,
          );
        });
      });

      context('When caller is not the lister', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(originalAsset, maxLockPeriod, baseRate, tokenId, false);
        });

        it('reverts', async () => {
          await expect(listingManager.connect(stranger).unpauseListing(listingId)).to.be.revertedWith(
            'CallerIsNotAssetLister()',
          );
        });
      });

      context('When asset not paused', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(originalAsset, maxLockPeriod, baseRate, tokenId, false);
        });

        it('reverts', async () => {
          await expect(listingManager.connect(nftCreator).unpauseListing(listingId)).to.be.revertedWith(
            'ListingIsNotPaused()',
          );
        });
      });

      context('When successfully unpaused', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(originalAsset, maxLockPeriod, baseRate, tokenId, false);
          await listingManager.connect(nftCreator).pauseListing(listingId);
        });

        it('emits an event', async () => {
          const tx = await listingManager.connect(nftCreator).unpauseListing(listingId);

          await expect(tx).to.emit(listingManager, 'ListingUnpaused').withArgs(listingId);
        });

        it('unpauses the listing', async () => {
          await listingManager.connect(nftCreator).unpauseListing(listingId);

          const asset = makeERC721Asset(originalAsset.address, tokenId);
          const listingParams = makeFixedPriceStrategy(baseRate);

          await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct({
            asset: asset,
            params: listingParams,
            lister: nftCreator.address,
            maxLockPeriod: maxLockPeriod,
            lockedTill: 0,
            immediatePayout: false,
            delisted: false,
            paused: false,
          });
        });
      });
    });

    describe('listingCount', () => {
      it('todo');
    });

    describe('listings', () => {
      it('todo');
    });

    describe('userListings', () => {
      it('todo');
    });

    describe('listingInfo', () => {
      it('todo');
    });
  });
}
