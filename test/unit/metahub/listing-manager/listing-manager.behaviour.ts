import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import {
  ERC20Mock,
  ERC721Mock,
  ERC721Mock__factory,
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
import { AssetListerHelper, deployRandomERC721Token } from '../../../shared/utils';
import { makeERC721Asset, makeFixedPriceStrategy, solidityId } from '../../../../src';

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
  // eslint-disable-next-line sonarjs/cognitive-complexity
  describe('IListingManager', function () {
    let listingManager: IListingManager;
    let originalAsset: ERC721Mock;
    let metahub: IMetahub;
    let erc721assetVault: IERC721AssetVault;
    let assetClassRegistry: IAssetClassRegistry;
    let assetController: IAssetController;
    let universeRegistry: IUniverseRegistry;
    let warperPresetFactory: IWarperPresetFactory;
    let warperManager: IWarperManager;
    let listingStrategyRegistry: IListingStrategyRegistry;
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
        erc721assetVault,
        assetController,
        universeRegistry,
        assetClassRegistry,
        warperPresetFactory,
        warperManager,
        listingStrategyRegistry,
      } = this.contracts);
      originalAsset = this.mocks.assets.erc721;
      paymentToken = this.mocks.assets.erc20;

      nftCreator = this.signers.named.nftCreator;
      [stranger] = this.signers.unnamed;

      assetListerHelper = new AssetListerHelper(
        assetClassRegistry,
        assetController.address,
        erc721assetVault.address,
        listingManager,
        metahub,
        warperManager,
        universeRegistry,
        warperPresetFactory,
        listingStrategyRegistry,
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
            listingId: BigNumber.from(1),
            listingGroupId: BigNumber.from(1),
            lister: nftCreator.address,
            asset: asset,
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
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
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
          const listingInfoBefore = await listingManager.listingInfo(listingId);
          await listingManager.connect(nftCreator).delistAsset(listingId);

          await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct({
            ...listingInfoBefore,
            delisted: true,
          });

          // NOTE: the listing counts should not decrement!
          await expect(listingManager.listingCount(), 'Total listing count does not match').to.eventually.equal(1);
          await expect(
            listingManager.assetListingCount(originalAsset.address),
            'Asset listing count does not match',
          ).to.eventually.equal(1);
          await expect(
            listingManager.userListingCount(nftCreator.address),
            'User listing count does not match',
          ).to.eventually.equal(1);
        });
      });
    });

    describe('withdrawAsset', () => {
      context('When caller is not lister', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
        });

        it('reverts', async () => {
          await expect(listingManager.connect(stranger).withdrawAsset(listingId)).to.be.revertedWith(
            'CallerIsNotAssetLister()',
          );
        });
      });

      context('When the asset is locked', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );

          const rentingParams1 = {
            listingId: listingId,
            paymentToken: paymentToken.address,
            rentalPeriod: 300,
            renter: stranger.address,
            warper: warperAddress,
          };
          await warperManager.unpauseWarper(warperAddress);
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
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
        });

        it('deletes the listing record', async () => {
          await listingManager.connect(nftCreator).withdrawAsset(listingId);

          await expect(listingManager.listingInfo(listingId)).to.be.revertedWith(
            `ListingIsNotRegistered(${listingId.toString()})`,
          );

          // NOTE: the listing counts not decrement!
          await expect(listingManager.listingCount(), 'Total listing count does not match').to.eventually.equal(0);
          await expect(
            listingManager.assetListingCount(originalAsset.address),
            'Asset listing count does not match',
          ).to.eventually.equal(0);
          await expect(
            listingManager.userListingCount(nftCreator.address),
            'User listing count does not match',
          ).to.eventually.equal(0);
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
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
        });

        it('reverts', async () => {
          await expect(listingManager.connect(stranger).pauseListing(listingId)).to.be.revertedWith(
            'CallerIsNotAssetLister()',
          );
        });
      });

      context('When the listing is already paused', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
          await listingManager.connect(nftCreator).pauseListing(listingId);
        });

        it('reverts', async () => {
          await expect(listingManager.connect(nftCreator).pauseListing(listingId)).to.be.revertedWith(
            'ListingIsPaused()',
          );
        });
      });

      context('When the listing is not paused', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
        });

        it('emits an event', async () => {
          const tx = await listingManager.connect(nftCreator).pauseListing(listingId);

          await expect(tx).to.emit(listingManager, 'ListingPaused').withArgs(listingId);
        });

        it('pauses the listing', async () => {
          const listingInfoBefore = await listingManager.listingInfo(listingId);
          await listingManager.connect(nftCreator).pauseListing(listingId);
          await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct({
            ...listingInfoBefore,
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
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
        });

        it('reverts', async () => {
          await expect(listingManager.connect(stranger).unpauseListing(listingId)).to.be.revertedWith(
            'CallerIsNotAssetLister()',
          );
        });
      });

      context('When the listing is not paused', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
        });

        it('reverts', async () => {
          await expect(listingManager.connect(nftCreator).unpauseListing(listingId)).to.be.revertedWith(
            'ListingIsNotPaused()',
          );
        });
      });

      context('When the listing is paused', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
          await listingManager.connect(nftCreator).pauseListing(listingId);
        });

        it('emits an event', async () => {
          const tx = await listingManager.connect(nftCreator).unpauseListing(listingId);

          await expect(tx).to.emit(listingManager, 'ListingUnpaused').withArgs(listingId);
        });

        it('unpauses the listing', async () => {
          const listingInfoBefore = await listingManager.listingInfo(listingId);
          await listingManager.connect(nftCreator).unpauseListing(listingId);

          await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct({
            ...listingInfoBefore,
            paused: false,
          });
        });
      });
    });

    describe('listingCount', () => {
      context('When no listings', () => {
        it('returns 0', async () => {
          await expect(listingManager.listingCount()).to.eventually.equal(0);
        });
      });

      context('When two listings', () => {
        beforeEach(async () => {
          await assetListerHelper.listAsset(nftCreator, originalAsset, maxLockPeriod, baseRate, tokenId, false);
          await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            BigNumber.from(2),
            false,
          );
        });

        it('returns 2', async () => {
          await expect(listingManager.listingCount()).to.eventually.equal(2);
        });
      });
    });

    describe('listings', () => {
      context('When no listings', () => {
        it('returns 0', async () => {
          const offset = 0;
          const limit = 10;
          await expect(listingManager.listings(offset, limit)).to.eventually.deep.equal([[], []]);
        });
      });

      context('When 5 total listings', () => {
        let listings: Array<BigNumber> = [];
        beforeEach(async () => {
          listings = [];
          const listingCount = 5;
          for (let index = 0; index < listingCount; index++) {
            const tokenId = BigNumber.from(500 + index); // offset to not clash with the pre-minted token ids
            await originalAsset.mint(nftCreator.address, tokenId);
            listings.push(
              await assetListerHelper.listAsset(nftCreator, originalAsset, maxLockPeriod, baseRate, tokenId, false),
            );
          }
        });

        /**
         * Fetch all the listings in the specified range and compare the results with the returned data of `listingInfo`.
         * Also makes sure that the expected listing IDs are returned by comparing to the stored listing ids.
         */
        async function listingsAreEqual(limit: number, offset: number): Promise<void> {
          const retrievedListings = await listingManager.listings(offset, limit);

          for (let index = 0; index < retrievedListings[0].length; index++) {
            const listingId = retrievedListings[0][index];
            const listingData = retrievedListings[1][index];
            await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct(listingData);
          }
          expect(retrievedListings[0].length).to.equal(limit);
          expect(retrievedListings[1].length).to.equal(limit);

          expect(retrievedListings[0]).to.deep.equal(
            listings.slice(offset, offset + limit).map(e => BigNumber.from(e)),
          );
        }

        it('can request first 2 listings', async () => {
          await listingsAreEqual(0, 2);
        });

        it('can request next 2 listings', async () => {
          await listingsAreEqual(2, 2);
        });

        it('can request all listings', async () => {
          await listingsAreEqual(0, 5);
        });

        context('There are less listings than requested', () => {
          it('returns the requested amount', async () => {
            const retrievedListings = await listingManager.listings(0, 10);

            expect(retrievedListings[0].length).to.equal(5);
            expect(retrievedListings[1].length).to.equal(5);
          });
        });
      });
    });

    describe('userListings', () => {
      context('When no listings', () => {
        it('returns 0', async () => {
          const offset = 0;
          const limit = 10;
          await expect(listingManager.userListings(stranger.address, offset, limit)).to.eventually.deep.equal([[], []]);
        });
      });

      context('When user has 5 listings, but in total there are 10', () => {
        let listings: Array<BigNumber> = [];
        beforeEach(async () => {
          listings = [];
          const listingCount = 5;
          for (let index = 0; index < listingCount; index++) {
            const tokenId = BigNumber.from(500 + index); // offset to not clash with the pre-minted token ids
            const tokenId2 = BigNumber.from(600 + index); // offset to not clash with the pre-minted token ids
            await originalAsset.mint(nftCreator.address, tokenId);
            await originalAsset.mint(stranger.address, tokenId2);
            await assetListerHelper.listAsset(nftCreator, originalAsset, maxLockPeriod, baseRate, tokenId, false);
            listings.push(
              await assetListerHelper.listAsset(stranger, originalAsset, maxLockPeriod, baseRate, tokenId2, false),
            );
          }
        });

        /**
         * Fetch all the listings in the specified range and compare the results with the returned data of `listingInfo`.
         * Also makes sure that the expected listing IDs are returned by comparing to the stored listing ids.
         */
        async function listingsAreEqual(limit: number, offset: number): Promise<void> {
          const retrievedListings = await listingManager.userListings(stranger.address, offset, limit);

          for (let index = 0; index < retrievedListings[0].length; index++) {
            const listingId = retrievedListings[0][index];
            const listingData = retrievedListings[1][index];
            await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct(listingData);
          }
          expect(retrievedListings[0].length).to.equal(limit);
          expect(retrievedListings[1].length).to.equal(limit);

          expect(retrievedListings[0]).to.deep.equal(
            listings.slice(offset, offset + limit).map(e => BigNumber.from(e)),
          );
        }

        it('can request first 2 listings', async () => {
          await listingsAreEqual(0, 2);
        });

        it('can request next 2 listings', async () => {
          await listingsAreEqual(2, 2);
        });

        it('can request all listings', async () => {
          await listingsAreEqual(0, 5);
        });

        context('When a user has less listings than requested', () => {
          it('returns the requested amount', async () => {
            const retrievedListings = await listingManager.userListings(stranger.address, 0, 10);

            expect(retrievedListings[0].length).to.equal(5);
            expect(retrievedListings[1].length).to.equal(5);
          });
        });

        context('When the offset is larger than total amount', () => {
          it('returns empty arrays', async () => {
            const retrievedListings = await listingManager.userListings(stranger.address, 5, 10);

            expect(retrievedListings).to.deep.equal([[], []]);
          });
        });
      });
    });

    describe('listingInfo', () => {
      context('When the listing exists', () => {
        let listingId: BigNumber;
        beforeEach(async () => {
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
        });

        it('returns the information', async () => {
          const asset = makeERC721Asset(originalAsset.address, tokenId);
          const listingParams = makeFixedPriceStrategy(baseRate);
          const listingGroupId = await assetListerHelper.listingGroupId(listingId);

          await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct({
            asset: asset,
            params: listingParams,
            lister: nftCreator.address,
            maxLockPeriod: maxLockPeriod,
            lockedTill: 0,
            immediatePayout: false,
            delisted: false,
            paused: false,
            groupId: listingGroupId,
          });
        });
      });

      context('Listing does not exist', () => {
        it('reverts', async () => {
          const listingId = 1;
          await expect(listingManager.listingInfo(listingId)).to.revertedWith(`ListingIsNotRegistered(${listingId})`);
        });
      });
    });

    describe('userListingCount', () => {
      context('When no listings exist', () => {
        it('returns 0', async () => {
          await expect(listingManager.userListingCount(stranger.address)).to.eventually.equal(0);
        });
      });

      context('When 10 listings exist, but 5 owned by queried user', () => {
        beforeEach(async () => {
          const listingCount = 5;
          for (let index = 0; index < listingCount; index++) {
            const tokenId = BigNumber.from(500 + index); // offset to not clash with the pre-minted token ids
            const tokenId2 = BigNumber.from(600 + index); // offset to not clash with the pre-minted token ids
            await originalAsset.mint(nftCreator.address, tokenId);
            await originalAsset.mint(stranger.address, tokenId2);
            await assetListerHelper.listAsset(nftCreator, originalAsset, maxLockPeriod, baseRate, tokenId, false);
            await assetListerHelper.listAsset(stranger, originalAsset, maxLockPeriod, baseRate, tokenId2, false);
          }
        });

        it('returns 5', async () => {
          await expect(listingManager.userListingCount(stranger.address)).to.eventually.equal(5);
        });
      });
    });

    describe('assetListingCount', () => {
      context('When no listings exist', () => {
        it('returns 0', async () => {
          await expect(listingManager.assetListingCount(originalAsset.address)).to.eventually.equal(0);
        });
      });

      context('When 10 listings exist, 4 for asset A, 6 for asset B', () => {
        const listingCountA = 4;
        const listingCountB = 6;
        let originalAssetA: ERC721Mock;
        let originalAssetB: ERC721Mock;
        beforeEach(async () => {
          originalAssetA = originalAsset;
          originalAssetB = ERC721Mock__factory.connect((await deployRandomERC721Token()).address, originalAsset.signer);
          await assetListerHelper.setupWarper(originalAssetB, universeId, warperRegistrationParams);

          for (const iterator of [
            { count: listingCountA, asset: originalAssetA },
            { count: listingCountB, asset: originalAssetB },
          ]) {
            for (let index = 0; index < iterator.count; index++) {
              const tokenId = BigNumber.from(500 + index); // offset to not clash with the pre-minted token ids
              await iterator.asset.mint(nftCreator.address, tokenId);
              await assetListerHelper.listAsset(nftCreator, iterator.asset, maxLockPeriod, baseRate, tokenId, false);
            }
          }
        });

        context('When querying asset A', () => {
          it('returns 5', async () => {
            await expect(listingManager.assetListingCount(originalAssetA.address)).to.eventually.equal(listingCountA);
          });
        });

        context('When querying asset B', () => {
          it('returns 6', async () => {
            await expect(listingManager.assetListingCount(originalAssetB.address)).to.eventually.equal(listingCountB);
          });
        });
      });
    });

    describe('assetListings', () => {
      context('When no listings', () => {
        it('returns 0', async () => {
          const offset = 0;
          const limit = 10;
          await expect(listingManager.assetListings(originalAsset.address, offset, limit)).to.eventually.deep.equal([
            [],
            [],
          ]);
        });
      });

      context('When user has 5 listings, but in total there are 10', () => {
        const listingCountA = 4;
        const listingCountB = 6;
        let originalAssetA: ERC721Mock;
        let originalAssetB: ERC721Mock;
        let listingsB: Array<BigNumber>;
        beforeEach(async () => {
          originalAssetA = originalAsset;
          originalAssetB = ERC721Mock__factory.connect((await deployRandomERC721Token()).address, originalAsset.signer);
          await assetListerHelper.setupWarper(originalAssetB, universeId, warperRegistrationParams);

          listingsB = [];
          for (const iterator of [
            { count: listingCountA, asset: originalAssetA, listingBucket: [] },
            { count: listingCountB, asset: originalAssetB, listingBucket: listingsB }, // Reference to the `listings` var
          ]) {
            for (let index = 0; index < iterator.count; index++) {
              const tokenId = BigNumber.from(500 + index); // offset to not clash with the pre-minted token ids
              await iterator.asset.mint(nftCreator.address, tokenId);
              iterator.listingBucket.push(
                await assetListerHelper.listAsset(nftCreator, iterator.asset, maxLockPeriod, baseRate, tokenId, false),
              );
            }
          }
        });

        /**
         * Fetch all the listings in the specified range and compare the results with the returned data of `listingInfo`.
         * Also makes sure that the expected listing IDs are returned by comparing to the stored listing ids.
         */
        async function listingsAreEqual(limit: number, offset: number): Promise<void> {
          const retrievedListings = await listingManager.assetListings(originalAssetB.address, offset, limit);

          for (let index = 0; index < retrievedListings[0].length; index++) {
            const listingId = retrievedListings[0][index];
            const listingData = retrievedListings[1][index];
            await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct(listingData);
          }
          expect(retrievedListings[0].length).to.equal(limit);
          expect(retrievedListings[1].length).to.equal(limit);

          expect(retrievedListings[0]).to.deep.equal(
            listingsB.slice(offset, offset + limit).map(e => BigNumber.from(e)),
          );
        }

        it('can request first 2 listings', async () => {
          await listingsAreEqual(0, 2);
        });

        it('can request next 2 listings', async () => {
          await listingsAreEqual(2, 2);
        });

        it('can request all listings', async () => {
          await listingsAreEqual(0, 5);
        });

        context('Am original asset has less listings than requested', () => {
          it('returns the requested amount', async () => {
            const retrievedListings = await listingManager.assetListings(originalAssetB.address, 0, 10);

            expect(retrievedListings[0].length).to.equal(6);
            expect(retrievedListings[1].length).to.equal(6);
          });
        });

        context('Offset larger than total amount', () => {
          it('returns empty arrays', async () => {
            const retrievedListings = await listingManager.assetListings(originalAssetB.address, 6, 10);

            expect(retrievedListings).to.deep.equal([[], []]);
          });
        });
      });
    });
  });
}
