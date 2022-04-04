import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ERC721Mock, IMetahub, IUniverseRegistry, IWarperManager, IWarperPresetFactory } from '../../../../typechain';
import { createUniverse, deployWarperPreset, registerWarper } from '../../../shared/utils';
import { warperPresetId } from '../Metahub';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeWarperManager(): void {
  describe('IWarperManager', function () {
    let warperManager: IWarperManager;
    let metahub: IMetahub;
    let warperPresetFactory: IWarperPresetFactory;
    let universeRegistry: IUniverseRegistry;
    let originalAsset: ERC721Mock;

    let deployer: SignerWithAddress;
    let stranger: SignerWithAddress;

    const warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct = {
      name: 'Warper',
      universeId: 1,
      paused: true,
    };

    const universeRegisatrationParams = {
      name: 'IQ Universe',
      rentalFeePercent: 1000,
    };

    beforeEach(function () {
      originalAsset = this.mocks.assets.erc721;
      warperPresetFactory = this.contracts.warperPresetFactory;
      warperManager = this.contracts.warperManager;
      universeRegistry = this.contracts.universeRegistry;
      metahub = this.contracts.metahub;

      deployer = this.signers.named['deployer'];
      [stranger] = this.signers.unnamed;
    });

    describe('registerWarper', () => {
      context('When non-existent universe ID is provided', () => {
        it('reverts', async () => {
          await expect(
            warperManager.registerWarper('0xfbe4805Fd0ebe0Dd46b7ED8f6fcFD96798FFC742', warperRegistrationParams),
          ).to.be.revertedWith('ERC721: owner query for nonexistent token');
        });
      });

      context('When the Universe is created', () => {
        let universeId: BigNumber;
        beforeEach(async () => {
          // Note: tests are depending on pre-existing behaviour defined by the IUniverseManager
          universeId = await createUniverse(universeRegistry, universeRegisatrationParams);
          warperRegistrationParams.universeId = universeId;
        });

        context('When invalid warper address is provided', () => {
          it('reverts', async () => {
            await expect(
              warperManager.registerWarper('0xfbe4805Fd0ebe0Dd46b7ED8f6fcFD96798FFC742', warperRegistrationParams),
            ).to.be.revertedWith('InvalidWarperInterface()');
          });
        });

        context('When the warper is deployed', () => {
          let warperAddress: string;

          beforeEach(async () => {
            warperAddress = await deployWarperPreset(
              warperPresetFactory,
              warperPresetId,
              metahub.address,
              originalAsset.address,
            );
          });

          context('When called by stranger', () => {
            it('reverts', async () => {
              await expect(
                warperManager.connect(stranger).registerWarper(warperAddress, warperRegistrationParams),
              ).to.be.revertedWith(`AccountIsNotUniverseOwner("${stranger.address}")`);
            });
          });

          context('When called by the warper universe owner', () => {
            context('When valid warper provided', () => {
              //it('registers the warper', async () => {
              //  await warperManager.registerWarper(warperAddress, warperRegistrationParams);
              //  expect(false).to.eq(true);
              //});

              it('emits a WarperRegistered event', async () => {
                await expect(warperManager.registerWarper(warperAddress, warperRegistrationParams))
                  .to.emit(warperManager, 'WarperRegistered')
                  .withArgs(universeId, warperAddress, originalAsset.address);
              });
            });
          });
        });
      });
    });

    describe('warperPresetFactory', () => {
      it('returns the warper preset factory address', async () => {
        await expect(warperManager.warperPresetFactory()).to.eventually.eq(warperPresetFactory.address);
      });
    });

    describe('universeWarpers', () => {
      let warperAddress1: string;
      let warperAddress2: string;
      let universeId: BigNumber;

      it('returns an empty list', async () => {
        await expect(warperManager.universeWarpers(1)).to.eventually.be.empty;
      });

      context('When warpers are registered', () => {
        beforeEach(async () => {
          universeId = await createUniverse(universeRegistry, universeRegisatrationParams);
          warperRegistrationParams.universeId = universeId;
          warperAddress1 = await deployWarperPreset(
            warperPresetFactory,
            warperPresetId,
            metahub.address,
            originalAsset.address,
          );
          await registerWarper(warperManager, warperAddress1, warperRegistrationParams);
          warperAddress2 = await deployWarperPreset(
            warperPresetFactory,
            warperPresetId,
            metahub.address,
            originalAsset.address,
          );
          await registerWarper(warperManager, warperAddress2, warperRegistrationParams);
        });

        it('returns a list of warpers for the universe', async () => {
          await expect(warperManager.universeWarpers(universeId)).to.eventually.deep.eq([
            warperAddress1,
            warperAddress2,
          ]);
        });
      });
    });

    describe('assetWarpers', () => {
      let warperAddress1: string;
      let warperAddress2: string;
      let universeId: BigNumber;

      it('returns an empty list', async () => {
        await expect(warperManager.universeWarpers(1)).to.eventually.be.empty;
      });

      context('When warpers are registered', () => {
        beforeEach(async () => {
          universeId = await createUniverse(universeRegistry, universeRegisatrationParams);
          warperRegistrationParams.universeId = universeId;
          warperAddress1 = await deployWarperPreset(
            warperPresetFactory,
            warperPresetId,
            metahub.address,
            originalAsset.address,
          );
          await registerWarper(warperManager, warperAddress1, warperRegistrationParams);
          warperAddress2 = await deployWarperPreset(
            warperPresetFactory,
            warperPresetId,
            metahub.address,
            originalAsset.address,
          );
          await registerWarper(warperManager, warperAddress2, warperRegistrationParams);
        });

        it('returns a list of warpers for original asset', async () => {
          await expect(warperManager.assetWarpers(originalAsset.address)).to.eventually.deep.eq([
            warperAddress1,
            warperAddress2,
          ]);
        });
      });
    });
  });
}
