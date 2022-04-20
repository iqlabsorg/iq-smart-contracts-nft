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
import {
  AssetClass,
  createUniverse,
  deployRandomERC721Token,
  deployWarperPreset,
  registerWarper,
} from '../../../shared/utils';
import { warperPresetId } from '../Metahub';
import { Warpers } from '../../../../typechain/contracts/warper/IWarperManager';

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
      const classConfig = await assetClassRegistry.assetClassConfig(AssetClass.ERC721);
      const original = originalAssetAddress ?? originalAsset.address;

      for (const i in [...Array(count).keys()]) {
        const name = `Warper ${i}`;
        const paused = false;
        const address = await deployWarperPreset(warperPresetFactory, warperPresetId, metahub.address, original);
        await registerWarper(warperManager, address, { universeId, name, paused });

        result[address] = {
          controller: classConfig.controller,
          original,
          name,
          universeId,
          paused,
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

      // Register ERC721 asset class.
      await this.contracts.assetClassRegistry.registerAssetClass(AssetClass.ERC721, {
        controller: this.contracts.assetController.address,
        vault: this.contracts.erc721assetVault.address,
      });

      // Assume a universe is already registered.
      // Note: tests are depending on pre-existing behaviour defined by the IUniverseManager
      universeId = await createUniverse(universeRegistry, {
        name: 'Universe',
        rentalFeePercent: 1000,
      });
      warperRegistrationParams.universeId = universeId;
    });

    describe('registerWarper', () => {
      context('When non-existent universe ID is provided', () => {
        it('reverts', async () => {
          const universeId = 12345;
          await expect(
            warperManager.registerWarper('0xfbe4805Fd0ebe0Dd46b7ED8f6fcFD96798FFC742', {
              ...warperRegistrationParams,
              universeId,
            }),
          ).to.be.revertedWith(`QueryForNonexistentUniverse(${universeId})`);
        });
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

    describe('deregisterWarper', () => {
      it('todo');
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
      });
    });

    describe('supportedAssetCount', () => {
      context('When warpers are not registered', () => {
        it('returns 0', async () => {
          await expect(warperManager.supportedAssetCount()).to.eventually.eq(0);
        });
      });
      context('When warpers are registered', () => {
        beforeEach(async () => {
          const original1 = await deployRandomERC721Token();
          await deployManyWarperPresetsAndRegister(universeId, 2, original1.address);
          const original2 = await deployRandomERC721Token();
          await deployManyWarperPresetsAndRegister(universeId, 1, original2.address);
        });
        it('returns correct warper count', async () => {
          await expect(warperManager.supportedAssetCount()).to.eventually.eq(2);
        });
      });
    });

    describe('supportedAssets', () => {
      context('When warpers are not registered', () => {
        it('returns an empty list', async () => {
          await expect(warperManager.supportedAssets(0, 10)).to.eventually.eql([]);
        });
      });
      context('When warpers are registered', () => {
        const supportedAssets: string[] = [];
        beforeEach(async () => {
          // register warpers for different original assets
          for (let i = 0; i < 3; i++) {
            const original = await deployRandomERC721Token();
            // deploy 2 warper for each original asset
            await deployManyWarperPresetsAndRegister(universeId, 2, original.address);
            supportedAssets.push(original.address);
          }
        });
        it('returns a paginated list of supported asset addresses', async () => {
          const limit = 2;
          for (let offset = 0; offset < supportedAssets.length; offset += limit) {
            await expect(warperManager.supportedAssets(offset, limit)).to.eventually.eql(
              supportedAssets.slice(offset, offset + limit),
            );
          }
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
