import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import {
  ERC721Mock,
  IAssetClassRegistry,
  IMetahub,
  IUniverseRegistry,
  IWarperManager,
  IWarperPresetFactory,
} from '../../../../typechain';
import { AssetClass, createUniverse, deployWarperPreset, registerWarper } from '../../../shared/utils';
import { warperPresetId } from '../Metahub';
import { Warpers } from '../../../../typechain/IWarperManager';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeWarperManager(): void {
  describe('IWarperManager', function () {
    let assetClassRegistry: IAssetClassRegistry;
    let warperManager: IWarperManager;
    let metahub: IMetahub;
    let warperPresetFactory: IWarperPresetFactory;
    let universeRegistry: IUniverseRegistry;
    let originalAsset: ERC721Mock;

    let stranger: SignerWithAddress;

    const warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct = {
      name: 'Warper',
      universeId: 1,
      paused: true,
    };

    const universeRegistrationParams = {
      name: 'Universe',
      rentalFeePercent: 1000,
    };

    const deployManyWarperPresetsAndRegister = async (
      universeId: BigNumberish,
      count: number,
    ): Promise<Record<string, Warpers.WarperStruct>> => {
      const result: Record<string, Warpers.WarperStruct> = {};
      const classConfig = await assetClassRegistry.assetClassConfig(AssetClass.ERC721);

      for (const i in [...Array(count).keys()]) {
        const name = `Warper ${i}`;
        const paused = false;
        const address = await deployWarperPreset(
          warperPresetFactory,
          warperPresetId,
          metahub.address,
          originalAsset.address,
        );
        await registerWarper(warperManager, address, { universeId, name, paused });

        result[address] = {
          original: originalAsset.address,
          controller: classConfig.controller,
          name,
          universeId,
          paused,
        };
      }
      return result;
    };

    beforeEach(function () {
      originalAsset = this.mocks.assets.erc721;
      warperPresetFactory = this.contracts.warperPresetFactory;
      warperManager = this.contracts.warperManager;
      universeRegistry = this.contracts.universeRegistry;
      assetClassRegistry = this.contracts.assetClassRegistry;
      metahub = this.contracts.metahub;

      [stranger] = this.signers.unnamed;
    });

    describe('registerWarper', () => {
      context('When non-existent universe ID is provided', () => {
        it('reverts', async () => {
          await expect(
            warperManager.registerWarper('0xfbe4805Fd0ebe0Dd46b7ED8f6fcFD96798FFC742', warperRegistrationParams),
          ).to.be.revertedWith('QueryForNonexistentUniverse(1)');
        });
      });

      context('When the Universe is created', () => {
        let universeId: BigNumber;
        beforeEach(async () => {
          // Note: tests are depending on pre-existing behaviour defined by the IUniverseManager
          universeId = await createUniverse(universeRegistry, universeRegistrationParams);
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
              it('registers the warper');

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

    describe('deregisterWarper', () => {
      it('todo');
    });

    describe('universeWarperCount', () => {
      it('todo');
    });

    describe('universeWarpers', () => {
      it('returns an empty list', async () => {
        await expect(warperManager.universeWarpers(1, 0, 10)).to.eventually.eql([[], []]);
      });

      context('When warpers are registered', () => {
        let universeId: BigNumber;
        let universeWarpers: Record<string, Warpers.WarperStruct>;
        const warperCount = 12;
        beforeEach(async () => {
          universeId = await createUniverse(universeRegistry, universeRegistrationParams);
          universeWarpers = await deployManyWarperPresetsAndRegister(universeId, warperCount);
        });

        it('returns a paginated list of warpers for the universe', async () => {
          const limit = 3;
          for (let offset = 0; offset < warperCount; offset += limit) {
            const result = await warperManager.universeWarpers(universeId, offset, limit);
            expect(result[0]).to.eql(Object.keys(universeWarpers).slice(offset, offset + limit));
            expect(result[1]).containsAllStructs(Object.values(universeWarpers).slice(offset, offset + limit));
          }
        });
      });
    });

    describe('assetWarperCount', () => {
      it('todo');
    });

    describe('assetWarpers', () => {
      it('returns an empty list', async () => {
        await expect(warperManager.assetWarpers(originalAsset.address, 0, 10)).to.eventually.eql([[], []]);
      });

      context('When warpers are registered', () => {
        let assetWarpers: Record<string, Warpers.WarperStruct>;
        const warperCount = 9;
        beforeEach(async () => {
          const universeId = await createUniverse(universeRegistry, universeRegistrationParams);
          assetWarpers = await deployManyWarperPresetsAndRegister(universeId, warperCount);
        });

        it('returns a paginated list of warpers for original asset', async () => {
          const limit = 2;
          for (let offset = 0; offset < warperCount; offset += limit) {
            const result = await warperManager.assetWarpers(originalAsset.address, offset, limit);
            expect(result[0]).to.eql(Object.keys(assetWarpers).slice(offset, offset + limit));
            expect(result[1]).containsAllStructs(Object.values(assetWarpers).slice(offset, offset + limit));
          }
        });
      });
    });

    describe('supportedAssetCount', () => {
      it('todo');
    });

    describe('supportedAssets', () => {
      it('todo');
    });

    describe('warperPresetFactory', () => {
      it('returns the warper preset factory address', async () => {
        await expect(warperManager.warperPresetFactory()).to.eventually.eq(warperPresetFactory.address);
      });
    });

    describe('isWarperAdmin', () => {
      it('todo');
    });

    describe('warperInfo', () => {
      it('todo');
    });

    describe('warperController', () => {
      it('todo');
    });

    describe('pauseWarper', () => {
      it('todo');
    });

    describe('unpauseWarper', () => {
      it('todo');
    });
  });
}
