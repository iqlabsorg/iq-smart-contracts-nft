import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { formatBytes32String } from 'ethers/lib/utils';
import { beforeEach } from 'mocha';
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
  IRentingManager,
  IUniverseRegistry,
  IWarperController__factory,
  IWarperManager,
  IWarperPresetFactory,
} from '../../../../typechain';
import { Rentings } from '../../../../typechain/IRentingManager';
import { AddressZero } from '../../../shared/types';
import { AssetListerHelper, latestBlockTimestamp, makeERC721Asset, waitBlockchainTime } from '../../../shared/utils';

const universeRegistrationParams = {
  name: 'IQ Universe',
  rentalFeePercent: 1000,
};

const emptyRentingAgreement: Rentings.AgreementStruct = {
  warpedAsset: {
    id: { class: '0x00000000', data: '0x' },
    value: BigNumber.from(0),
  },
  collectionId: '0x0000000000000000000000000000000000000000000000000000000000000000',
  listingId: BigNumber.from(0),
  renter: AddressZero,
  startTime: 0,
  endTime: 0,
};

const warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct = {
  name: 'Warper',
  universeId: 1,
  paused: true,
};

export const warperPresetId = formatBytes32String('ERC721Basic');

const maxLockPeriod = 86400;
const baseRate = 100;
const tokenId = BigNumber.from(1);

const maxPaymentAmount = 100_000_000;

/**
 * The metahub contract behaves like IRentingManager
 */
export function shouldBehaveLikeRentingManager(): void {
  describe('IRentingManager', function () {
    let rentingManager: IRentingManager;
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

    let assetListerHelper: AssetListerHelper;

    let nftCreator: SignerWithAddress;
    let stranger: SignerWithAddress;

    let universeId: BigNumber;
    let listingId: BigNumber;
    let warperAddress: string;

    beforeEach(async function () {
      ({
        rentingManager,
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
        originalAsset,
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
    });

    describe('collectionRentedValue', () => {
      // TODO
    });

    describe('assetRentalStatus', () => {
      // TODO
    });

    describe('estimateRent', () => {
      // TODO
    });

    describe('rent', () => {
      beforeEach(async () => {
        // Setup
        await paymentToken.mint(stranger.address, maxPaymentAmount);
        await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);
      });

      context('Item is listed', () => {
        beforeEach(async () => {
          warperAddress = await assetListerHelper.setupWarper(universeId, warperRegistrationParams);
          listingId = await assetListerHelper.listAsset(maxLockPeriod, baseRate, tokenId);
        });

        context('Valid renting params', () => {
          context('Warper is not paused', () => {
            beforeEach(async () => {
              await metahub.unpauseWarper(warperAddress);
            });

            it('successfully rents an asset', async () => {
              const rentalParams = {
                listingId: listingId,
                paymentToken: paymentToken.address,
                rentalPeriod: 1000,
                renter: stranger.address,
                warper: warperAddress,
              };

              // Execute tx
              const rentalId = await rentingManager.connect(stranger).callStatic.rent(rentalParams, maxPaymentAmount);
              const tx = await rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount);

              // Assert
              await expect(tx).to.emit(rentingManager, 'AssetRented');

              const receipt = await tx.wait();
              const events = await rentingManager.queryFilter(
                rentingManager.filters.AssetRented(),
                receipt.blockNumber,
              );
              const assetRented = events[0].args;
              const blockTimestamp = await latestBlockTimestamp();
              const asset = makeERC721Asset(warperAddress, 1);
              expect(assetRented).to.equalStruct({
                rentalId: rentalId,
                renter: stranger.address,
                listingId: rentalParams.listingId,
                warpedAsset: asset,
                startTime: blockTimestamp,
                endTime: blockTimestamp + rentalParams.rentalPeriod,
              });
            });
          });
        });
      });

      context('Item already rented', () => {
        it('reverts');
      });
    });

    describe('rentalAgreementInfo', () => {
      let listingId2: BigNumber;

      beforeEach(async () => {
        // Setup
        await paymentToken.mint(stranger.address, maxPaymentAmount);
        await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);

        warperAddress = await assetListerHelper.setupWarper(universeId, warperRegistrationParams);
        // Listing for item 1
        listingId = await assetListerHelper.listAsset(maxLockPeriod, baseRate, tokenId);

        // Listing for item 2
        listingId2 = await assetListerHelper.listAsset(maxLockPeriod, baseRate, BigNumber.from(2));
        await metahub.unpauseWarper(warperAddress);
      });

      context('Asset rented', () => {
        context('Multiple rental agreements already exist: idx [0],[2] are expired; [1],[4] are active', () => {
          let rentalIds: Array<BigNumber>;
          let rentingParams1: Rentings.ParamsStruct;
          let rentingParams2: Rentings.ParamsStruct;
          let blockTimeActiveRental2: number;
          let blockTimeActiveRental1: number;

          beforeEach(async () => {
            rentingParams1 = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 100,
              renter: stranger.address,
              warper: warperAddress,
            };

            rentingParams2 = {
              listingId: listingId2,
              paymentToken: paymentToken.address,
              rentalPeriod: maxLockPeriod, // does not expire during the test
              renter: stranger.address,
              warper: warperAddress,
            };

            // Create 3 rentals
            rentalIds = [];
            {
              await waitBlockchainTime(2000);
              rentalIds.push(await rentingManager.connect(stranger).callStatic.rent(rentingParams1, maxPaymentAmount));
              await rentingManager.connect(stranger).rent(rentingParams1, maxPaymentAmount);

              rentalIds.push(await rentingManager.connect(stranger).callStatic.rent(rentingParams2, maxPaymentAmount));
              await rentingManager.connect(stranger).rent(rentingParams2, maxPaymentAmount);
              blockTimeActiveRental2 = await latestBlockTimestamp();
            }

            {
              await waitBlockchainTime(2000);
              rentalIds.push(await rentingManager.connect(stranger).callStatic.rent(rentingParams1, maxPaymentAmount));
              await rentingManager.connect(stranger).rent(rentingParams1, maxPaymentAmount);
            }

            {
              await waitBlockchainTime(2000);
              rentalIds.push(await rentingManager.connect(stranger).callStatic.rent(rentingParams1, maxPaymentAmount));
              await rentingManager.connect(stranger).rent(rentingParams1, maxPaymentAmount);
              blockTimeActiveRental1 = await latestBlockTimestamp();
            }
          });

          context('Accessing expired rental agreement (idx [0],[1],[2])', () => {
            it('returns a cleared data structure', async () => {
              for (const iterator of [0, 2]) {
                await expect(rentingManager.rentalAgreementInfo(rentalIds[iterator])).to.eventually.equalStruct(
                  emptyRentingAgreement,
                );
              }
            });
          });

          context('Accessing active rental agreement (idx [3],[4])', () => {
            it('returns the rental agreement', async () => {
              const validAgreements = [
                {
                  tokenId: 2,
                  rentalIdx: 1,
                  activatedAt: blockTimeActiveRental2,
                  rentingParams: rentingParams2,
                },
                {
                  tokenId: 1,
                  rentalIdx: 3,
                  activatedAt: blockTimeActiveRental1,
                  rentingParams: rentingParams1,
                },
              ];
              for (const iterator of validAgreements) {
                const assetStruct = makeERC721Asset(warperAddress, iterator.tokenId);
                const warperController = IWarperController__factory.connect(
                  await metahub.warperController(warperAddress),
                  metahub.signer,
                );
                const collectionId = await warperController.collectionId(assetStruct.id);
                const rentingAgreement: Rentings.AgreementStruct = {
                  warpedAsset: makeERC721Asset(warperAddress, iterator.tokenId),
                  collectionId: collectionId,
                  listingId: iterator.rentingParams.listingId,
                  renter: stranger.address,
                  startTime: iterator.activatedAt,
                  endTime: iterator.activatedAt + Number(iterator.rentingParams.rentalPeriod),
                };

                await expect(
                  rentingManager.rentalAgreementInfo(rentalIds[iterator.rentalIdx]),
                ).to.eventually.equalStruct(rentingAgreement);
              }
            });
          });
        });
      });
    });

    describe('userRentalAgreements', () => {
      // TODO
    });

    describe('userRentalCount', () => {
      let listingId2: BigNumber;
      beforeEach(async () => {
        // Setup
        await paymentToken.mint(stranger.address, maxPaymentAmount);
        await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);

        warperAddress = await assetListerHelper.setupWarper(universeId, warperRegistrationParams);

        // Listing for item 1
        listingId = await assetListerHelper.listAsset(maxLockPeriod, baseRate, tokenId);

        // Listing for item 2
        listingId2 = await assetListerHelper.listAsset(maxLockPeriod, baseRate, BigNumber.from(2));
        await metahub.unpauseWarper(warperAddress);
      });

      context('Multiple (4) rental agreements already exist', () => {
        beforeEach(async () => {
          const rentalParams = {
            listingId: listingId,
            paymentToken: paymentToken.address,
            rentalPeriod: 1000,
            renter: stranger.address,
            warper: warperAddress,
          };

          // Create 3 existing rentals
          for (let index = 0; index < 3; index++) {
            await waitBlockchainTime(20000);
            await rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount);
          }
          await rentingManager.connect(stranger).rent({ ...rentalParams, listingId: listingId2 }, maxPaymentAmount);
        });

        context('All rental agreements are expired', () => {
          beforeEach(async () => {
            await waitBlockchainTime(20000);
          });

          context('2 are not cleaned up', () => {
            it('returns the rental agreement count (2)', async () => {
              await expect(rentingManager.userRentalCount(stranger.address)).to.eventually.equal(2);
            });
          });

          context('all are cleaned up', () => {
            beforeEach(() => {
              // TODO there's no method to clean up expired rentals without renting new ones
            });

            it.skip('returns the rental agreement count (0)', async () => {
              await expect(rentingManager.userRentalCount(stranger.address)).to.eventually.equal(0);
            });
          });
        });

        context('Latest 2 rental agreements are active', () => {
          it('returns the rental agreement count (2)', async () => {
            await expect(rentingManager.userRentalCount(stranger.address)).to.eventually.equal(2);
          });
        });
      });
    });
  });
}
