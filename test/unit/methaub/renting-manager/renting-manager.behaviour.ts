import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { formatBytes32String, solidityKeccak256 } from 'ethers/lib/utils';
import hre from 'hardhat';
import { beforeEach } from 'mocha';
import {
  ERC20Mock,
  ERC721Mock,
  ERC721Mock__factory,
  ERC721WarperControllerMock,
  ERC721WarperControllerMock__factory,
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
import { Assets, Rentings } from '../../../../typechain/contracts/metahub/Metahub';
import { ASSET_CLASS } from '../../../shared/constants';
import { ADDRESS_ZERO } from '../../../shared/types';
import {
  AssetListerHelper,
  ASSET_RENTAL_STATUS,
  deployRandomERC721Token,
  latestBlockTimestamp,
  makeERC721Asset,
  makeFixedPriceStrategy,
  waitBlockchainTime,
} from '../../../shared/utils';

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
  renter: ADDRESS_ZERO,
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
  // eslint-disable-next-line sonarjs/cognitive-complexity
  describe('IRentingManager', function (): void {
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
      context('When warper registered and listed', () => {
        let collectionId: string;
        let listingId2: BigNumber;
        beforeEach(async () => {
          warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
          await metahub.unpauseWarper(warperAddress);
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
          listingId2 = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            BigNumber.from(2),
            false,
          );

          const warperController = IWarperController__factory.connect(
            await metahub.warperController(warperAddress),
            metahub.signer,
          );
          const assetStruct = makeERC721Asset(warperAddress, tokenId);
          collectionId = await warperController.collectionId(assetStruct.id);
        });

        context('When no collections rented', () => {
          it('returns 0', async () => {
            await expect(rentingManager.collectionRentedValue(collectionId, stranger.address)).to.eventually.equal(0);
          });
        });
        context('When 2 active, 1 expired rental agreements', () => {
          beforeEach(async () => {
            // Setup
            await paymentToken.mint(stranger.address, maxPaymentAmount);
            await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);

            const rentingParams1 = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 100,
              renter: stranger.address,
              warper: warperAddress,
            };
            {
              // Rent asset 1
              await rentingManager.connect(stranger).rent(rentingParams1, maxPaymentAmount);
            }
            {
              // Rent asset 2
              await rentingManager
                .connect(stranger)
                .rent({ ...rentingParams1, listingId: listingId2, rentalPeriod: 2000 }, maxPaymentAmount);
            }
            {
              // force-expire asset 1, rent it again
              await waitBlockchainTime(150); // will not expire the second rented asset
              await rentingManager.connect(stranger).rent(rentingParams1, maxPaymentAmount);
            }
          });

          it('returns aggregate value (amount) of the 2 active rentals', async () => {
            await expect(rentingManager.collectionRentedValue(collectionId, stranger.address)).to.eventually.equal(2);
          });
        });
      });

      context('When warper not registered and listed', () => {
        it('returns 0', async () => {
          const randomCollectionId = solidityKeccak256(['address'], [ADDRESS_ZERO]);
          await expect(rentingManager.collectionRentedValue(randomCollectionId, stranger.address)).to.eventually.equal(
            0,
          );
        });
      });
    });

    describe('assetRentalStatus', () => {
      let assetStruct: Assets.AssetStruct;
      beforeEach(async () => {
        warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
        assetStruct = makeERC721Asset(warperAddress, tokenId);
      });

      context('When asset not listed', () => {
        it('returns RentalStatus.NONE', async () => {
          await expect(rentingManager.assetRentalStatus(assetStruct.id)).to.eventually.equal(ASSET_RENTAL_STATUS.NONE);
        });
      });

      context('When asset listed', () => {
        beforeEach(async () => {
          await metahub.unpauseWarper(warperAddress);
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
        });

        context('When asset rented', () => {
          beforeEach(async () => {
            await paymentToken.mint(stranger.address, maxPaymentAmount);
            await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);

            const rentingParams = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 100,
              renter: stranger.address,
              warper: warperAddress,
            };
            await rentingManager.connect(stranger).rent(rentingParams, maxPaymentAmount);
          });

          context('When rental is active', () => {
            it('returns RentalStatus.RENTED', async () => {
              await expect(rentingManager.assetRentalStatus(assetStruct.id)).to.eventually.equal(
                ASSET_RENTAL_STATUS.RENTED,
              );
            });
          });

          context('When rental is expired', () => {
            beforeEach(async () => {
              await waitBlockchainTime(150); // will not expire the second rented asset
            });

            it('returns RentalStatus.AVAILABLE', async () => {
              await expect(rentingManager.assetRentalStatus(assetStruct.id)).to.eventually.equal(
                ASSET_RENTAL_STATUS.AVAILABLE,
              );
            });
          });
        });
      });
    });

    describe('estimateRent', () => {
      describe('Invalid renting params', () => {
        context('When invalid base token', () => {
          let anotherToken: ERC20Mock;
          beforeEach(async () => {
            universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
            warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
            listingId = await assetListerHelper.listAsset(
              nftCreator,
              originalAsset,
              maxLockPeriod,
              baseRate,
              tokenId,
              false,
            );
            await metahub.unpauseWarper(warperAddress);
            anotherToken = (await hre.run('deploy:mock:ERC20', {
              name: 'Random ERC20',
              symbol: 'TST',
              decimals: 18,
              totalSupply: 1,
            })) as ERC20Mock;
          });

          it('reverts', async () => {
            const rentalParams = {
              listingId: listingId,
              paymentToken: anotherToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            await expect(rentingManager.connect(stranger).estimateRent(rentalParams)).to.be.revertedWith(
              'BaseTokenMismatch()',
            );
          });
        });

        context('When item not listed', () => {
          beforeEach(async () => {
            universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
            warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
            await metahub.unpauseWarper(warperAddress);
          });

          it('reverts', async () => {
            const rentalParams = {
              listingId: BigNumber.from(42),
              paymentToken: paymentToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            await expect(rentingManager.connect(stranger).estimateRent(rentalParams)).to.be.revertedWith(
              'NotListed(42)',
            );
          });
        });

        context('When listing is paused', () => {
          beforeEach(async () => {
            universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
            warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
            listingId = await assetListerHelper.listAsset(
              nftCreator,
              originalAsset,
              maxLockPeriod,
              baseRate,
              tokenId,
              false,
            );
            await metahub.unpauseWarper(warperAddress);
            await listingManager.connect(nftCreator).pauseListing(listingId);
          });

          it('reverts', async () => {
            const rentalParams = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            await expect(rentingManager.connect(stranger).estimateRent(rentalParams)).to.be.revertedWith(
              'ListingIsPaused()',
            );
          });
        });

        describe('Invalid rental period', () => {
          beforeEach(async () => {
            universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
            warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
            await metahub.unpauseWarper(warperAddress);
            listingId = await assetListerHelper.listAsset(
              nftCreator,
              originalAsset,
              maxLockPeriod,
              baseRate,
              tokenId,
              false,
            );
          });

          context('When lock period exceeds max rental lock period', () => {
            it('reverts', async () => {
              const rentalParams = {
                listingId: listingId,
                paymentToken: paymentToken.address,
                rentalPeriod: maxLockPeriod * 2,
                renter: stranger.address,
                warper: warperAddress,
              };

              await expect(rentingManager.connect(stranger).estimateRent(rentalParams)).to.be.revertedWith(
                `InvalidLockPeriod(${maxLockPeriod * 2})`,
              );
            });
          });

          context('When lock period equals 0', () => {
            it('reverts', async () => {
              const rentalParams = {
                listingId: listingId,
                paymentToken: paymentToken.address,
                rentalPeriod: 0,
                renter: stranger.address,
                warper: warperAddress,
              };

              await expect(rentingManager.connect(stranger).estimateRent(rentalParams)).to.be.revertedWith(
                'InvalidLockPeriod(0)',
              );
            });
          });
        });

        context('When warper not registered', () => {
          beforeEach(async () => {
            universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
            warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
            await metahub.unpauseWarper(warperAddress);
            listingId = await assetListerHelper.listAsset(
              nftCreator,
              originalAsset,
              maxLockPeriod,
              baseRate,
              tokenId,
              false,
            );
            await metahub.deregisterWarper(warperAddress);
          });

          it('reverts', async () => {
            const rentalParams = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            await expect(rentingManager.connect(stranger).estimateRent(rentalParams)).to.be.revertedWith(
              `WarperIsNotRegistered(\\"${warperAddress}\\")`,
            );
          });
        });

        context('When original assets do not match (checkCompatibleAsset)', () => {
          let listingId2: BigNumber;
          let newToken: ERC721Mock;
          beforeEach(async () => {
            universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
            warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
            await metahub.unpauseWarper(warperAddress);
            listingId = await assetListerHelper.listAsset(
              nftCreator,
              originalAsset,
              maxLockPeriod,
              baseRate,
              tokenId,
              false,
            );

            // Create another listing for a different warper
            const tokenData = await deployRandomERC721Token();

            newToken = ERC721Mock__factory.connect(tokenData.address, metahub.signer);
            await newToken.mint(nftCreator.address, 1);

            // NOTE: a new warper address is being created here
            await assetListerHelper.setupWarper(newToken, universeId, warperRegistrationParams);
            listingId2 = await assetListerHelper.listAsset(
              nftCreator,
              newToken,
              maxLockPeriod,
              baseRate,
              BigNumber.from(1),
              false,
            );
          });

          it('reverts', async () => {
            // listingId2.warper address != warperAddress passed below
            const rentalParams = {
              listingId: listingId2,
              paymentToken: paymentToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            await expect(rentingManager.connect(stranger).estimateRent(rentalParams)).to.be.revertedWith(
              `IncompatibleAsset(\\"${newToken.address}\\")`,
            );
          });
        });

        context('When warper is paused', () => {
          beforeEach(async () => {
            universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
            warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
            await metahub.unpauseWarper(warperAddress);
            listingId = await assetListerHelper.listAsset(
              nftCreator,
              originalAsset,
              maxLockPeriod,
              baseRate,
              tokenId,
              false,
            );
            await metahub.pauseWarper(warperAddress);
          });

          it('reverts', async () => {
            const rentalParams = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            await expect(rentingManager.connect(stranger).estimateRent(rentalParams)).to.be.revertedWith(
              `WarperIsPaused()`,
            );
          });
        });

        context('When listing is delisted', () => {
          beforeEach(async () => {
            universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
            warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
            await metahub.unpauseWarper(warperAddress);
            listingId = await assetListerHelper.listAsset(
              nftCreator,
              originalAsset,
              maxLockPeriod,
              baseRate,
              tokenId,
              false,
            );
            await listingManager.connect(nftCreator).delistAsset(listingId);
          });

          it('reverts', async () => {
            const rentalParams = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            await expect(rentingManager.connect(stranger).estimateRent(rentalParams)).to.be.revertedWith(
              `NotListed(${rentalParams.listingId.toString()})`,
            );
          });
        });
      });

      describe('Valid rental params', () => {
        let mockedWarperController: ERC721WarperControllerMock;
        beforeEach(async () => {
          // Deploying a warper controller mock here so we can force-set the premiums
          // NOTE: Not using `smock` because it has problems with returning tuples/structs
          mockedWarperController = await new ERC721WarperControllerMock__factory(metahub.signer).deploy();
          await assetClassRegistry.setAssetClassController(ASSET_CLASS.ERC721, mockedWarperController.address);

          // General setup
          universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
          warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
          await metahub.unpauseWarper(warperAddress);
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
        });

        context('When all premiums are present', () => {
          const controllerUniversePremium = BigNumber.from(99);
          const controllerListerPremium = BigNumber.from(42);

          beforeEach(async () => {
            await mockedWarperController.setPremiums(controllerUniversePremium, controllerListerPremium);
          });

          it('returns the expected result', async () => {
            // Currently set fees
            const universeRentalFeePercent = universeRegistrationParams.rentalFeePercent;
            const costPerSecond = baseRate;
            const protocolRentalFeePercent = await metahub.protocolRentalFeePercent();

            // Estimation
            const rentalParams = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 360, // 5 mins
              renter: stranger.address,
              warper: warperAddress,
            };
            const estimate = await rentingManager.estimateRent(rentalParams);

            // calculate the expenses manually
            const listerBaseFee = BigNumber.from(costPerSecond).mul(rentalParams.rentalPeriod);
            const universeBaseFee = listerBaseFee.mul(universeRentalFeePercent).div(10_000);
            const protocolFee = listerBaseFee.mul(protocolRentalFeePercent).div(10_000);
            const listerPremium = controllerListerPremium;
            const universePremium = controllerUniversePremium;
            const total = listerBaseFee.add(universeBaseFee).add(protocolFee).add(listerPremium).add(universePremium);

            // Assert
            expect(universeBaseFee.toNumber()).to.be.lessThan(listerBaseFee.toNumber());
            expect(protocolFee.toNumber()).to.be.lessThan(listerBaseFee.toNumber());
            expect(estimate).to.equalStruct({
              listerBaseFee: listerBaseFee,
              universeBaseFee: universeBaseFee,
              protocolFee: protocolFee,
              listerPremium: listerPremium,
              universePremium: universePremium,
              total: total,
            });
          });
        });
      });
    });

    describe('rent', () => {
      beforeEach(async () => {
        // Setup
        await paymentToken.mint(stranger.address, maxPaymentAmount);
        await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);
      });

      context('When msg.sender is not the renter', () => {
        beforeEach(async () => {
          await paymentToken.mint(stranger.address, maxPaymentAmount);
          await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);

          warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
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
          const rentalParams = {
            listingId: listingId,
            paymentToken: paymentToken.address,
            rentalPeriod: 1000,
            renter: nftCreator.address,
            warper: warperAddress,
          };

          await expect(rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount)).to.be.revertedWith(
            'CallerIsNotRenter()',
          );
        });
      });

      context('When invalid rental params', () => {
        context('When base token does not match renting params', () => {
          let anotherToken: ERC20Mock;

          beforeEach(async () => {
            anotherToken = (await hre.run('deploy:mock:ERC20', {
              name: 'Random ERC20',
              symbol: 'TST',
              decimals: 18,
              totalSupply: 1,
            })) as ERC20Mock;
          });

          it('reverts', async () => {
            const rentalParams = {
              listingId: listingId,
              paymentToken: anotherToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            await expect(rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount)).to.be.revertedWith(
              'BaseTokenMismatch()',
            );
          });
        });

        context('When item is not listed', () => {
          it('reverts', async () => {
            const rentalParams = {
              listingId: BigNumber.from(42),
              paymentToken: paymentToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            await expect(rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount)).to.be.revertedWith(
              'NotListed(42)',
            );
          });
        });

        context('When item is listed', () => {
          beforeEach(async () => {
            warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
            listingId = await assetListerHelper.listAsset(
              nftCreator,
              originalAsset,
              maxLockPeriod,
              baseRate,
              tokenId,
              false,
            );
          });

          context('When listing is paused', () => {
            beforeEach(async () => {
              await listingManager.connect(nftCreator).pauseListing(listingId);
            });

            it('reverts', async () => {
              const rentalParams = {
                listingId: listingId,
                paymentToken: paymentToken.address,
                rentalPeriod: 1000,
                renter: stranger.address,
                warper: warperAddress,
              };

              await expect(rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount)).to.be.revertedWith(
                'ListingIsPaused()',
              );
            });
          });

          describe('ERC721WarperController', () => {
            context('When warper already rented', () => {
              let rentalParams: Rentings.ParamsStruct;

              beforeEach(async () => {
                rentalParams = {
                  listingId: listingId,
                  paymentToken: paymentToken.address,
                  rentalPeriod: 1000,
                  renter: stranger.address,
                  warper: warperAddress,
                };

                await metahub.unpauseWarper(warperAddress);
                await rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount);
              });

              it('reverts', async () => {
                await expect(rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount)).to.be.revertedWith(
                  'AlreadyRented()',
                );
              });
            });

            // --------- ERC721 Warper Controller tests (remove ?) --------- //
          });

          describe('Payment management', () => {
            context('When total fees exceed the max specified payment amount', () => {
              it('reverts'); // RentalFeeSlippage()
            });
          });
        });
      });

      context('immediate payout is turned on', () => {
        beforeEach(async () => {
          const mockedWarperController = await new ERC721WarperControllerMock__factory(metahub.signer).deploy();
          await assetClassRegistry.setAssetClassController(ASSET_CLASS.ERC721, mockedWarperController.address);

          await mockedWarperController.setPremiums(100, 300);

          warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            true,
          );
          await metahub.unpauseWarper(warperAddress);
        });

        context('asset is rented', () => {
          let rentalParams: Rentings.ParamsStruct;
          let rentCost: Rentings.RentalFeesStructOutput;
          beforeEach(async () => {
            rentalParams = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            rentCost = await rentingManager.connect(stranger).estimateRent(rentalParams);
          });
          it('transfers the rental price to the lister', async () => {
            await expect(async () =>
              rentingManager.connect(stranger).rent(rentalParams, rentCost.total),
            ).to.changeTokenBalance(paymentToken, nftCreator, rentCost.listerBaseFee.add(rentCost.listerPremium));
          });

          it('transfers the according amount of tokens to the manager', async () => {
            await expect(async () =>
              rentingManager.connect(stranger).rent(rentalParams, rentCost.total),
            ).to.changeTokenBalance(
              paymentToken,
              rentingManager,
              rentCost.protocolFee.add(rentCost.universeBaseFee).add(rentCost.universePremium),
            );
          });

          it('increases universe balance', async () => {
            await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);

            await expect(metahub.universeBalance(universeId, paymentToken.address)).to.eventually.equal(
              rentCost.universeBaseFee.add(rentCost.universePremium),
            );
          });

          it('increases protocol balance', async () => {
            await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);

            await expect(metahub.protocolBalance(paymentToken.address)).to.eventually.equal(rentCost.protocolFee);
          });

          it('emits event on rent', async () => {
            const rentalId = await rentingManager.connect(stranger).callStatic.rent(rentalParams, rentCost.total);
            const tx = await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);

            // Assert
            const receipt = await tx.wait();
            const events = await rentingManager.queryFilter(rentingManager.filters.AssetRented(), receipt.blockNumber);
            const assetRented = events[0].args;
            const blockTimestamp = await latestBlockTimestamp();
            const asset = makeERC721Asset(warperAddress, 1);

            await expect(tx).to.emit(rentingManager, 'AssetRented');
            expect(assetRented).to.equalStruct({
              rentalId: rentalId,
              renter: stranger.address,
              listingId: rentalParams.listingId,
              warpedAsset: asset,
              startTime: blockTimestamp,
              endTime: blockTimestamp + Number(rentalParams.rentalPeriod),
            });
          });

          it('changes the owner of the Warped token', async () => {
            await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);
            await expect(
              ERC721Mock__factory.connect(warperAddress, metahub.signer).ownerOf(tokenId),
            ).to.eventually.equal(stranger.address);
          });

          it('Updates the `lockedTill` parameter', async () => {
            await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);
            const timestamp = await latestBlockTimestamp();
            const asset = makeERC721Asset(originalAsset.address, tokenId);
            const listingParams = makeFixedPriceStrategy(baseRate);

            await expect(listingManager.listingInfo(listingId)).to.eventually.equalStruct({
              asset: asset,
              params: listingParams,
              lister: nftCreator.address,
              maxLockPeriod: maxLockPeriod,
              lockedTill: BigNumber.from(timestamp).add(rentalParams.rentalPeriod).toNumber(),
              immediatePayout: true,
              delisted: false,
              paused: false,
            });
          });
        });
      });

      context('accumulative payout is turned on', () => {
        beforeEach(async () => {
          const mockedWarperController = await new ERC721WarperControllerMock__factory(metahub.signer).deploy();
          await assetClassRegistry.setAssetClassController(ASSET_CLASS.ERC721, mockedWarperController.address);

          await mockedWarperController.setPremiums(100, 300);

          warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
          await metahub.unpauseWarper(warperAddress);
        });

        context('asset is rented', () => {
          let rentalParams: Rentings.ParamsStruct;
          let rentCost: Rentings.RentalFeesStructOutput;
          beforeEach(async () => {
            rentalParams = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 1000,
              renter: stranger.address,
              warper: warperAddress,
            };

            rentCost = await rentingManager.connect(stranger).estimateRent(rentalParams);
          });

          it('increases the token balance of the lister', async () => {
            await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);

            await expect(metahub.balance(nftCreator.address, paymentToken.address)).to.eventually.equal(
              rentCost.listerBaseFee.add(rentCost.listerPremium),
            );
          });

          it('transfers the according amount of tokens to the manager', async () => {
            await expect(async () =>
              rentingManager.connect(stranger).rent(rentalParams, rentCost.total),
            ).to.changeTokenBalance(
              paymentToken,
              rentingManager,
              rentCost.protocolFee
                .add(rentCost.universeBaseFee)
                .add(rentCost.universePremium)
                .add(rentCost.listerBaseFee)
                .add(rentCost.listerPremium),
            );
          });

          it('increases universe balance', async () => {
            await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);

            await expect(metahub.universeBalance(universeId, paymentToken.address)).to.eventually.equal(
              rentCost.universeBaseFee.add(rentCost.universePremium),
            );
          });

          it('increases protocol balance', async () => {
            await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);

            await expect(metahub.protocolBalance(paymentToken.address)).to.eventually.equal(rentCost.protocolFee);
          });

          it('emits event on rent', async () => {
            const rentalId = await rentingManager.connect(stranger).callStatic.rent(rentalParams, rentCost.total);
            const tx = await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);

            // Assert
            const receipt = await tx.wait();
            const events = await rentingManager.queryFilter(rentingManager.filters.AssetRented(), receipt.blockNumber);
            const assetRented = events[0].args;
            const blockTimestamp = await latestBlockTimestamp();
            const asset = makeERC721Asset(warperAddress, 1);

            await expect(tx).to.emit(rentingManager, 'AssetRented');
            expect(assetRented).to.equalStruct({
              rentalId: rentalId,
              renter: stranger.address,
              listingId: rentalParams.listingId,
              warpedAsset: asset,
              startTime: blockTimestamp,
              endTime: blockTimestamp + Number(rentalParams.rentalPeriod),
            });
          });

          it('changes the owner of the Warped token', async () => {
            await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);
            await expect(
              ERC721Mock__factory.connect(warperAddress, metahub.signer).ownerOf(tokenId),
            ).to.eventually.equal(stranger.address);
          });
        });
      });

      context('When item already rented', () => {
        let rentalParams: Rentings.ParamsStruct;
        let rentCost: Rentings.RentalFeesStructOutput;
        beforeEach(async () => {
          const mockedWarperController = await new ERC721WarperControllerMock__factory(metahub.signer).deploy();
          await assetClassRegistry.setAssetClassController(ASSET_CLASS.ERC721, mockedWarperController.address);
          await mockedWarperController.setPremiums(100, 300);

          warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
          listingId = await assetListerHelper.listAsset(
            nftCreator,
            originalAsset,
            maxLockPeriod,
            baseRate,
            tokenId,
            false,
          );
          await metahub.unpauseWarper(warperAddress);

          rentalParams = {
            listingId: listingId,
            paymentToken: paymentToken.address,
            rentalPeriod: 1000,
            renter: stranger.address,
            warper: warperAddress,
          };
          rentCost = await rentingManager.connect(stranger).estimateRent(rentalParams);
          await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);
        });

        it('reverts', async () => {
          await expect(rentingManager.connect(stranger).rent(rentalParams, rentCost.total)).to.be.revertedWith(
            'AlreadyRented()',
          );
        });
      });
    });

    describe('rentalAgreementInfo', () => {
      let listingId2: BigNumber;

      beforeEach(async () => {
        // Setup
        await paymentToken.mint(stranger.address, maxPaymentAmount);
        await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);

        warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
        // Listing for item 1
        listingId = await assetListerHelper.listAsset(
          nftCreator,
          originalAsset,
          maxLockPeriod,
          baseRate,
          tokenId,
          false,
        );

        // Listing for item 2
        listingId2 = await assetListerHelper.listAsset(
          nftCreator,
          originalAsset,
          maxLockPeriod,
          baseRate,
          BigNumber.from(2),
          false,
        );
        await metahub.unpauseWarper(warperAddress);
      });

      context('When asset rented', () => {
        context('When multiple rental agreements already exist: idx [0],[2] are expired; [1],[4] are active', () => {
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

            // Create 4 rentals
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

          context('When accessing expired rental agreement (idx [0],[1],[2])', () => {
            it('returns a cleared data structure', async () => {
              for (const iterator of [0, 2]) {
                await expect(rentingManager.rentalAgreementInfo(rentalIds[iterator])).to.eventually.equalStruct(
                  emptyRentingAgreement,
                );
              }
            });
          });

          context('When accessing active rental agreement (idx [3],[4])', () => {
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
      beforeEach(async () => {
        universeId = await assetListerHelper.setupUniverse(universeRegistrationParams);
        warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);
        await metahub.unpauseWarper(warperAddress);
      });

      context('A user has more rental agreements than requested (6 rentals)', function () {
        this.timeout(720_000);
        let rentalAgreements: Array<BigNumber>;

        beforeEach(async () => {
          rentalAgreements = [];
          for (let index = 0; index < 6; index++) {
            const newTokenId = index + 100;
            await originalAsset.mint(nftCreator.address, newTokenId);
            const listingId = await assetListerHelper.listAsset(
              nftCreator,
              originalAsset,
              maxLockPeriod,
              baseRate,
              BigNumber.from(newTokenId),
              false,
            );

            const rentingParams = {
              listingId: listingId,
              paymentToken: paymentToken.address,
              rentalPeriod: 100,
              renter: stranger.address,
              warper: warperAddress,
            };

            await paymentToken.mint(stranger.address, maxPaymentAmount);
            await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);
            const rentalAgreement = await rentingManager
              .connect(stranger)
              .callStatic.rent(rentingParams, maxPaymentAmount);
            await rentingManager.connect(stranger).rent(rentingParams, maxPaymentAmount);
            rentalAgreements.push(rentalAgreement);
          }
        });

        async function assertAgreementsAreEqual(limit: number, offset: number): Promise<void> {
          const retrievedRentalAgreements = await rentingManager.userRentalAgreements(stranger.address, offset, limit);

          for (let index = 0; index < retrievedRentalAgreements[0].length; index++) {
            const rentalId = retrievedRentalAgreements[0][index];
            const rentalData = retrievedRentalAgreements[1][index];
            await expect(rentingManager.rentalAgreementInfo(rentalId)).to.eventually.equalStruct(rentalData);
          }
          expect(retrievedRentalAgreements[0].length).to.equal(limit);
          expect(retrievedRentalAgreements[1].length).to.equal(limit);

          expect(retrievedRentalAgreements[0]).to.deep.equal(
            rentalAgreements.slice(offset, offset + limit).map(e => BigNumber.from(e)),
          );
        }

        it('returns only the requested ones (first 3)', async () => {
          await assertAgreementsAreEqual(3, 0);
        });

        it('returns only the requested ones (last 3)', async () => {
          await assertAgreementsAreEqual(3, 3);
        });

        context('A user has less rental agreements than requested', () => {
          it('returns only the requested amount', async () => {
            const retrievedRentalAgreements = await rentingManager.userRentalAgreements(stranger.address, 0, 10);

            expect(retrievedRentalAgreements[0].length).to.equal(6);
            expect(retrievedRentalAgreements[1].length).to.equal(6);
          });
        });

        context('Offset larger than total amount', () => {
          it('returns empty arrays', async () => {
            const retrievedRentalAgreements = await rentingManager.userRentalAgreements(stranger.address, 6, 10);

            expect(retrievedRentalAgreements).to.deep.equal([[], []]);
          });
        });
      });

      context('A user has no rental agreements', () => {
        it('returns an empty array', async () => {
          const retrievedRentalAgreements = await rentingManager.userRentalAgreements(stranger.address, 0, 10);

          expect(retrievedRentalAgreements[0].length).to.equal(0);
          expect(retrievedRentalAgreements[1].length).to.equal(0);
        });
      });
    });

    describe('userRentalCount', () => {
      let listingId2: BigNumber;
      beforeEach(async () => {
        // Setup
        await paymentToken.mint(stranger.address, maxPaymentAmount);
        await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);

        warperAddress = await assetListerHelper.setupWarper(originalAsset, universeId, warperRegistrationParams);

        // Listing for item 1
        listingId = await assetListerHelper.listAsset(
          nftCreator,
          originalAsset,
          maxLockPeriod,
          baseRate,
          tokenId,
          false,
        );

        // Listing for item 2
        listingId2 = await assetListerHelper.listAsset(
          nftCreator,
          originalAsset,
          maxLockPeriod,
          baseRate,
          BigNumber.from(2),
          false,
        );
        await metahub.unpauseWarper(warperAddress);
      });

      context('When multiple (4) rental agreements already exist', () => {
        beforeEach(async () => {
          const rentalParams = {
            listingId: listingId,
            paymentToken: paymentToken.address,
            rentalPeriod: 1000,
            renter: stranger.address,
            warper: warperAddress,
          };

          // Create 3 existing rentals for `listingId1`
          for (let index = 0; index < 3; index++) {
            await waitBlockchainTime(20000);
            await rentingManager.connect(stranger).rent(rentalParams, maxPaymentAmount);
          }
          // Create 1 rental for `listingId2`
          await rentingManager.connect(stranger).rent({ ...rentalParams, listingId: listingId2 }, maxPaymentAmount);
        });

        context('When all rental agreements are expired', () => {
          beforeEach(async () => {
            await waitBlockchainTime(20000);
          });

          context('When 2 rentals are not cleaned up', () => {
            it('returns the rental agreement count (2)', async () => {
              await expect(rentingManager.userRentalCount(stranger.address)).to.eventually.equal(2);
            });
          });

          context('When all rentals are cleaned up', () => {
            // TODO there's no method to clean up expired rentals without renting new ones
            it.skip('returns the rental agreement count (0)', async () => {
              await expect(rentingManager.userRentalCount(stranger.address)).to.eventually.equal(0);
            });
          });
        });

        context('When latest 2 rental agreements are active', () => {
          it('returns the rental agreement count (2)', async () => {
            await expect(rentingManager.userRentalCount(stranger.address)).to.eventually.equal(2);
          });
        });
      });
    });
  });
}