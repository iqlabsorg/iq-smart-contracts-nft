import hre from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import {
  ERC721Mock,
  ERC721WarperController,
  IAssetClassRegistry,
  IMetahub,
  IUniverseRegistry,
  IWarperManager,
  IWarperPresetFactory,
} from '../../../../typechain';
import { deployRandomERC721Token, deployWarperPreset, registerWarper, UniverseHelper } from '../../../shared/utils';
import { warperPresetId } from '../metahub';
import { Warpers } from '../../../../typechain/contracts/warper/IWarperManager';
import { ASSET_CLASS } from '../../../../src';
import { ADDRESS_ZERO } from '../../../shared/types';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeWarperManager(): void {
  // eslint-disable-next-line sonarjs/cognitive-complexity
  describe('IWarperManager', function (): void {
    const RANDOM_ADDRESS = '0xfbe4805Fd0ebe0Dd46b7ED8f6fcFD96798FFC742';

    let assetClassRegistry: IAssetClassRegistry;
    let warperManager: IWarperManager;
    let metahub: IMetahub;
    let warperPresetFactory: IWarperPresetFactory;
    let universeRegistry: IUniverseRegistry;
    let originalAsset: ERC721Mock;

    let stranger: SignerWithAddress;
    let universeId: BigNumber;

    const warperRegistrationParams: IWarperManager.WarperRegistrationParamsStruct = {
      name: 'Warper',
      universeId: 1,
      paused: true,
    };

    const deployManyWarperPresetsAndRegister = async (
      universeId: BigNumberish,
      count: number,
      originalAssetAddress?: string,
    ): Promise<Record<string, Warpers.WarperStruct>> => {
      const result: Record<string, Warpers.WarperStruct> = {};
      const classConfig = await assetClassRegistry.assetClassConfig(ASSET_CLASS.ERC721);
      const original = originalAssetAddress ?? originalAsset.address;

      for (const i of [...Array(count).keys()]) {
        const name = `Warper ${i}`;
        const paused = false;
        const address = await deployWarperPreset(warperPresetFactory, warperPresetId, metahub.address, original);
        await registerWarper(warperManager, address, { universeId, name, paused });

        result[address] = {
          assetClass: ASSET_CLASS.ERC721,
          original,
          paused,
          controller: classConfig.controller,
          name,
          universeId,
        };
      }
      return result;
    };

    beforeEach(async function () {
      originalAsset = this.mocks.assets.erc721;
      warperPresetFactory = this.contracts.warperPresetFactory;
      warperManager = this.contracts.warperManager;
      universeRegistry = this.contracts.universeRegistry;
      assetClassRegistry = this.contracts.assetClassRegistry;
      metahub = this.contracts.metahub;

      [stranger] = this.signers.unnamed;

      // Assume a universe is already registered.
      // Note: tests are depending on pre-existing behaviour defined by the IUniverseManager
      ({ universeId } = await new UniverseHelper(universeRegistry).create({
        name: 'Universe',
        rentalFeePercent: 1000,
      }));
      warperRegistrationParams.universeId = universeId;
    });

    describe('registerWarper', () => {
      context('When non-existent universe ID is provided', () => {
        it('reverts', async () => {
          const universeId = 12345;
          await expect(
            warperManager.registerWarper(RANDOM_ADDRESS, {
              ...warperRegistrationParams,
              universeId,
            }),
          ).to.be.revertedWith(`QueryForNonexistentUniverse(${universeId})`);
        });
      });

      context('When invalid warper address is provided', () => {
        it('reverts', async () => {
          await expect(warperManager.registerWarper(RANDOM_ADDRESS, warperRegistrationParams)).to.be.revertedWith(
            'InvalidWarperInterface()',
          );
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
            it('registers the warper', async () => {
              await warperManager.registerWarper(warperAddress, warperRegistrationParams);
              const info = await warperManager.warperInfo(warperAddress);
              expect(info.universeId).to.eq(universeId);
              expect(info.original).to.eq(originalAsset.address);
              expect(info.assetClass).to.eq(ASSET_CLASS.ERC721);
            });

            it('emits a WarperRegistered event', async () => {
              await expect(warperManager.registerWarper(warperAddress, warperRegistrationParams))
                .to.emit(warperManager, 'WarperRegistered')
                .withArgs(universeId, warperAddress, originalAsset.address, ASSET_CLASS.ERC721);
            });
          });
        });
      });
    });

    describe('deregisterWarper', () => {
      let warperAddress: string;

      beforeEach(async () => {
        warperAddress = await deployWarperPreset(
          warperPresetFactory,
          warperPresetId,
          metahub.address,
          originalAsset.address,
        );
        await warperManager.registerWarper(warperAddress, warperRegistrationParams);
      });

      context('When called by stranger', () => {
        it('reverts', async () => {
          await expect(warperManager.connect(stranger).deregisterWarper(warperAddress)).to.be.revertedWith(
            `AccountIsNotUniverseOwner("${stranger.address}")`,
          );
        });
      });

      context('When called by the warper universe owner', () => {
        it('removes warper information', async () => {
          await warperManager.deregisterWarper(warperAddress);
          await expect(warperManager.warperInfo(warperAddress)).to.be.revertedWith('WarperIsNotRegistered');
        });

        it('emits WarperDeregistered event', async () => {
          await expect(warperManager.deregisterWarper(warperAddress))
            .to.emit(warperManager, 'WarperDeregistered')
            .withArgs(warperAddress);
        });
      });
    });

    describe('universeWarperCount', () => {
      context('When warpers are not registered', () => {
        it('returns 0', async () => {
          await expect(warperManager.universeWarperCount(universeId)).to.eventually.eq(0);
        });
      });

      context('When warpers are registered', () => {
        const warperCount = 3;
        beforeEach(async () => {
          await deployManyWarperPresetsAndRegister(universeId, warperCount);
        });

        it('returns correct warper count', async () => {
          await expect(warperManager.universeWarperCount(universeId)).to.eventually.eq(warperCount);
        });
      });
    });

    describe('universeWarpers', () => {
      context('When warpers are not registered', () => {
        it('returns an empty list', async () => {
          await expect(warperManager.universeWarpers(1, 0, 10)).to.eventually.eql([[], []]);
        });
      });

      context('When warpers are registered', () => {
        let universeWarpers: Record<string, Warpers.WarperStruct>;
        const warperCount = 7;
        beforeEach(async () => {
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

        context('Offset larger than total amount', () => {
          it('returns empty arrays', async () => {
            const result = await warperManager.universeWarpers(universeId, 7, 10);

            expect(result).to.deep.equal([[], []]);
          });
        });
      });
    });

    describe('assetWarperCount', () => {
      context('When warpers are not registered', () => {
        it('returns 0', async () => {
          await expect(warperManager.assetWarperCount(originalAsset.address)).to.eventually.eq(0);
        });
      });

      context('When warpers are registered', () => {
        const warperCount = 2;
        beforeEach(async () => {
          await deployManyWarperPresetsAndRegister(universeId, warperCount);
        });

        it('returns correct warper count', async () => {
          await expect(warperManager.assetWarperCount(originalAsset.address)).to.eventually.eq(warperCount);
        });
      });
    });

    describe('assetWarpers', () => {
      context('When warpers are not registered', () => {
        it('returns an empty list', async () => {
          await expect(warperManager.assetWarpers(originalAsset.address, 0, 10)).to.eventually.eql([[], []]);
        });
      });

      context('When warpers are registered', () => {
        let assetWarpers: Record<string, Warpers.WarperStruct>;
        const warperCount = 5;
        beforeEach(async () => {
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

        context('Offset larger than total amount', () => {
          it('returns empty arrays', async () => {
            const result = await warperManager.assetWarpers(originalAsset.address, 5, 10);

            expect(result).to.deep.equal([[], []]);
          });
        });
      });
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
      context('Query for non-existent warper', () => {
        it('revers', async () => {
          await expect(warperManager.warperInfo(ADDRESS_ZERO)).to.be.revertedWith('WarperIsNotRegistered');
        });
      });

      context('Query for registered warper', () => {
        let warperAddress: string;
        let warperInfo: Warpers.WarperStruct;
        let originalAddress: string;
        beforeEach(async () => {
          const original = await deployRandomERC721Token();

          const warpers = await deployManyWarperPresetsAndRegister(universeId, 1, original.address);
          warperAddress = Object.keys(warpers)[0];
          warperInfo = warpers[warperAddress];
          originalAddress = original.address;
        });

        it('returns the warper info', async () => {
          await expect(warperManager.warperInfo(warperAddress)).to.eventually.equalStruct({
            assetClass: ASSET_CLASS.ERC721,
            original: originalAddress,
            paused: false,
            controller: warperInfo.controller,
            name: 'Warper 0',
            universeId: universeId,
          });
        });
      });
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

    describe('setWarperController', () => {
      context('When warpers are not registered', () => {
        it('reverts', async () => {
          const { controller } = await assetClassRegistry.assetClassConfig(ASSET_CLASS.ERC721);
          await expect(warperManager.setWarperController([RANDOM_ADDRESS], controller)).to.be.revertedWith(
            'WarperIsNotRegistered',
          );
        });
      });

      context('When warpers are registered', () => {
        let registeredWarpers: Record<string, Warpers.WarperStruct>;
        const warperCount = 2;
        beforeEach(async () => {
          registeredWarpers = await deployManyWarperPresetsAndRegister(universeId, warperCount);
        });

        context('When the new controller is incompatible', () => {
          it('reverts', async () => {
            await expect(warperManager.setWarperController(Object.keys(registeredWarpers), RANDOM_ADDRESS)).to.be
              .reverted;
          });
        });

        context('When the new controller is compatible', () => {
          let newController: ERC721WarperController;
          beforeEach(async () => {
            newController = (await hre.run('deploy:erc721-warper-controller')) as ERC721WarperController;
          });

          it('set new controller', async () => {
            await warperManager.setWarperController(Object.keys(registeredWarpers), newController.address);
            for (const warperAddress of Object.keys(registeredWarpers)) {
              const warper = await warperManager.warperInfo(warperAddress);
              expect(warper.controller).to.not.eq(registeredWarpers[warperAddress].controller);
              expect(warper.controller).to.eq(newController.address);
            }
          });
        });
      });
    });
  });
}
