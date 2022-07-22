import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import { solidityKeccak256 } from 'ethers/lib/utils';
import hre from 'hardhat';
import { beforeEach } from 'mocha';
import {
  ERC20Mock,
  ERC721Mock,
  ERC721Mock__factory,
  ERC721WarperControllerMock,
  ERC721WarperControllerMock__factory,
  IAssetClassRegistry,
  IERC721AssetVault,
  IListingManager,
  IMetahub,
  IRentingManager,
  IUniverseRegistry,
  IWarperController__factory,
  IWarperManager,
  IWarperPresetFactory,
  WarperWithRenting,
  WarperWithRenting__factory,
} from '../../../../typechain';
import { Assets, Rentings } from '../../../../typechain/contracts/metahub/Metahub';
import { ASSET_CLASS, ASSET_RENTAL_STATUS, makeERC721Asset, makeFixedPriceStrategy } from '../../../../src';
import { ADDRESS_ZERO } from '../../../shared/types';
import {
  AssetRegistryHelper,
  deployRandomERC721Token,
  latestBlockTimestamp,
  ListingHelper,
  UniverseHelper,
  waitBlockchainTime,
  WarperHelper,
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
  listingParams: { strategy: '0x00000000', data: '0x' },
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
    let universeRegistry: IUniverseRegistry;
    let warperManager: IWarperManager;
    let warperPresetFactory: IWarperPresetFactory;
    let paymentToken: ERC20Mock;

    let assetListerHelper: ListingHelper;
    let warperHelper: WarperHelper;

    let nftCreator: SignerWithAddress;
    let stranger: SignerWithAddress;

    let universeId: BigNumber;
    let listingId: BigNumber;
    let listingGroupId: BigNumber;
    let warperAddress: string;

    beforeEach(async function () {
      ({
        rentingManager,
        listingManager,
        metahub,
        erc721assetVault,
        universeRegistry,
        assetClassRegistry,
        warperManager,
        warperPresetFactory,
      } = this.contracts);
      originalAsset = this.mocks.assets.erc721;
      paymentToken = this.mocks.assets.erc20;

      nftCreator = this.signers.named.nftCreator;
      [stranger] = this.signers.unnamed;

      // Instantiate the universe and the warpers
      await new AssetRegistryHelper(assetClassRegistry)
        .withERC721ClassConfig(erc721assetVault, this.contracts.erc721WarperController)
        .registerAssetClasses();
      ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
      warperHelper = new WarperHelper(warperPresetFactory, metahub, warperManager).withConfigurableWarperPreset();

      // Prepare listing helper
      assetListerHelper = new ListingHelper(listingManager)
        .withERC721Asset(originalAsset.address, tokenId)
        .withFixedPriceListingStrategy(baseRate)
        .withImmediatePayout(false)
        .withMaxLockPeriod(maxLockPeriod)
        .withLister(nftCreator);
    });

    describe('collectionRentedValue', () => {
      context('When warper registered and listed', () => {
        let collectionId: string;
        let listingId2: BigNumber;
        beforeEach(async () => {
          warperAddress = (
            await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
          ).address;
          await warperManager.unpauseWarper(warperAddress);

          ({ listingId } = await assetListerHelper.listAsset());
          ({ listingId: listingId2 } = await assetListerHelper.withERC721Asset(originalAsset.address, 2).listAsset());

          const warperController = IWarperController__factory.connect(
            await warperManager.warperController(warperAddress),
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
        warperAddress = (
          await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
        ).address;
        assetStruct = makeERC721Asset(warperAddress, tokenId);
      });

      context('When asset not listed', () => {
        it('returns RentalStatus.NONE', async () => {
          await expect(rentingManager.assetRentalStatus(assetStruct.id)).to.eventually.equal(ASSET_RENTAL_STATUS.NONE);
        });
      });

      context('When asset listed', () => {
        beforeEach(async () => {
          await warperManager.unpauseWarper(warperAddress);
          ({ listingId } = await assetListerHelper.listAsset());
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
            ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
            warperAddress = (
              await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
            ).address;
            await warperManager.unpauseWarper(warperAddress);
            ({ listingId } = await assetListerHelper.listAsset());

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
            ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
            warperAddress = (
              await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
            ).address;
            await warperManager.unpauseWarper(warperAddress);
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
            ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
            warperAddress = (
              await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
            ).address;
            await warperManager.unpauseWarper(warperAddress);
            ({ listingId } = await assetListerHelper.listAsset());
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
            ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
            warperAddress = (
              await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
            ).address;
            await warperManager.unpauseWarper(warperAddress);
            ({ listingId } = await assetListerHelper.listAsset());
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
            ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
            warperAddress = (
              await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
            ).address;
            await warperManager.unpauseWarper(warperAddress);
            ({ listingId } = await assetListerHelper.listAsset());
            await warperManager.deregisterWarper(warperAddress);
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
            ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
            warperAddress = (
              await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
            ).address;
            await warperManager.unpauseWarper(warperAddress);
            ({ listingId } = await assetListerHelper.listAsset());

            // Create another listing for a different warper
            const tokenData = await deployRandomERC721Token();

            newToken = ERC721Mock__factory.connect(tokenData.address, metahub.signer);
            await newToken.mint(nftCreator.address, 1);

            // NOTE: a new warper address is being created here
            await warperHelper.deployAndRegister(newToken, { ...warperRegistrationParams, universeId });
            ({ listingId: listingId2 } = await assetListerHelper.withERC721Asset(newToken.address, 1).listAsset());
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
            ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
            warperAddress = (
              await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
            ).address;
            ({ listingId } = await assetListerHelper.listAsset());
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
            ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
            warperAddress = (
              await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
            ).address;
            await warperManager.unpauseWarper(warperAddress);
            ({ listingId } = await assetListerHelper.listAsset());

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
          ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
          warperAddress = (
            await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
          ).address;
          await warperManager.unpauseWarper(warperAddress);
          ({ listingId } = await assetListerHelper.listAsset());
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
              total: total,
              protocolFee: protocolFee,
              listerBaseFee: listerBaseFee,
              listerPremium: listerPremium,
              universeBaseFee: universeBaseFee,
              universePremium: universePremium,
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
            warperAddress = (
              await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
            ).address;
            ({ listingId } = await assetListerHelper.listAsset());
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

                await warperManager.unpauseWarper(warperAddress);
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

      context('When immediate payout is turned on', () => {
        beforeEach(async () => {
          const mockedWarperController = await new ERC721WarperControllerMock__factory(metahub.signer).deploy();
          await assetClassRegistry.setAssetClassController(ASSET_CLASS.ERC721, mockedWarperController.address);

          await mockedWarperController.setPremiums(100, 300);

          warperAddress = (
            await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
          ).address;
          ({ listingId, listingGroupId } = await assetListerHelper.withImmediatePayout(true).listAsset());
          await warperManager.unpauseWarper(warperAddress);
        });

        context('When asset is rented', () => {
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
            await expect(tx)
              .to.emit(rentingManager, 'UserEarned')
              .withArgs(
                nftCreator.address,
                0,
                paymentToken.address,
                rentCost.listerBaseFee.add(rentCost.listerPremium),
              );
            await expect(tx)
              .to.emit(rentingManager, 'UniverseEarned')
              .withArgs(universeId, paymentToken.address, rentCost.universeBaseFee.add(rentCost.universePremium));
            await expect(tx)
              .to.emit(rentingManager, 'ProtocolEarned')
              .withArgs(paymentToken.address, rentCost.protocolFee);
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
              groupId: listingGroupId,
            });
          });
        });
      });

      context('accumulative payout is turned on', () => {
        beforeEach(async () => {
          const mockedWarperController = await new ERC721WarperControllerMock__factory(metahub.signer).deploy();
          await assetClassRegistry.setAssetClassController(ASSET_CLASS.ERC721, mockedWarperController.address);

          await mockedWarperController.setPremiums(100, 300);

          warperAddress = (
            await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
          ).address;
          ({ listingId, listingGroupId } = await assetListerHelper.listAsset());
          await warperManager.unpauseWarper(warperAddress);
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

          warperAddress = (
            await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
          ).address;
          ({ listingId, listingGroupId } = await assetListerHelper.listAsset());
          await warperManager.unpauseWarper(warperAddress);

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

      context('When renting an item with Rental Hook extension', () => {
        let warper: WarperWithRenting;
        let rentalParams: Rentings.ParamsStruct;
        let rentCost: Rentings.RentalFeesStructOutput;
        let rentalId: BigNumberish;
        beforeEach(async () => {
          warper = await new WarperWithRenting__factory(stranger).deploy();
          await warper.setSuccessState(true);
          await warper.__initialize(originalAsset.address, metahub.address);

          const mockedWarperController = await new ERC721WarperControllerMock__factory(metahub.signer).deploy();
          await assetClassRegistry.setAssetClassController(ASSET_CLASS.ERC721, mockedWarperController.address);
          await mockedWarperController.setPremiums(100, 300);

          await warperHelper.registerWarper(warper, { ...warperRegistrationParams, universeId });
          ({ listingId, listingGroupId } = await assetListerHelper.listAsset());

          await warperManager.unpauseWarper(warper.address);

          rentalParams = {
            listingId: listingId,
            paymentToken: paymentToken.address,
            rentalPeriod: 1000,
            renter: stranger.address,
            warper: warper.address,
          };
          rentCost = await rentingManager.connect(stranger).estimateRent(rentalParams);
          rentalId = await rentingManager.connect(stranger).callStatic.rent(rentalParams, rentCost.total);
        });

        context('mechanic call succeeds', () => {
          beforeEach(async () => {
            await warper.setSuccessState(true);
            await rentingManager.connect(stranger).rent(rentalParams, rentCost.total);
          });

          it('can be observed in side-effects', async () => {
            await expect(warper.rentalId()).to.eventually.eq(rentalId);
            await expect(warper.tokenId()).to.eventually.eq(tokenId);
            await expect(warper.amount()).to.eventually.eq(1);
            // NOTE: note asserting `rentalAgreement`
            // NOTE: note asserting `rentalEarnings`
          });
        });

        context('mechanic call does not succeed', () => {
          beforeEach(async () => {
            await warper.setSuccessState(false);
          });

          it('And error message gets raised', async () => {
            // NOTE: The exact error is not recognised by ethers some reason. "reverted with an unrecognized custom error".
            await expect(rentingManager.connect(stranger).rent(rentalParams, rentCost.total)).to.be.reverted;
          });
        });
      });
    });

    describe('rentalAgreementInfo', () => {
      let listingId2: BigNumber;

      beforeEach(async () => {
        // Setup
        await paymentToken.mint(stranger.address, maxPaymentAmount);
        await paymentToken.connect(stranger).approve(rentingManager.address, maxPaymentAmount);

        warperAddress = (
          await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
        ).address;
        ({ listingId } = await assetListerHelper.listAsset());
        ({ listingId: listingId2 } = await assetListerHelper.withERC721Asset(originalAsset.address, 2).listAsset());

        await warperManager.unpauseWarper(warperAddress);
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
                  await warperManager.warperController(warperAddress),
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
                  listingParams: makeFixedPriceStrategy(baseRate),
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
        ({ universeId } = await new UniverseHelper(universeRegistry).create(universeRegistrationParams));
        warperAddress = (
          await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
        ).address;

        await warperManager.unpauseWarper(warperAddress);
      });

      context('A user has more rental agreements than requested (6 rentals)', function () {
        this.timeout(720_000);
        let rentalAgreements: Array<BigNumber>;

        beforeEach(async () => {
          rentalAgreements = [];
          for (let index = 0; index < 6; index++) {
            const newTokenId = index + 100;
            await originalAsset.mint(nftCreator.address, newTokenId);

            warperAddress = (
              await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
            ).address;
            await warperManager.unpauseWarper(warperAddress);
            const { listingId } = await assetListerHelper
              .withERC721Asset(originalAsset.address, newTokenId)
              .listAsset();

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

        warperAddress = (
          await warperHelper.deployAndRegister(originalAsset, { ...warperRegistrationParams, universeId })
        ).address;
        // Listing for item 1

        ({ listingId } = await assetListerHelper.listAsset());

        // Listing for item 2
        ({ listingId: listingId2 } = await assetListerHelper.withERC721Asset(originalAsset.address, 2).listAsset());

        await warperManager.unpauseWarper(warperAddress);
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
