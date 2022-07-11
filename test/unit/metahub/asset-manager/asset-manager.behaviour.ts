import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { ASSET_CLASS } from '../../../../src';
import {
  ERC721Mock,
  IAssetClassRegistry,
  IAssetManager,
  IMetahub,
  IUniverseRegistry,
  IWarperPresetFactory,
} from '../../../../typechain';
import { Assets } from '../../../../typechain/contracts/metahub/IMetahub';
import { IWarperManager, Warpers } from '../../../../typechain/contracts/warper/IWarperManager';
import { createUniverse, deployRandomERC721Token, deployWarperPreset, registerWarper } from '../../../shared/utils';
import { warperPresetId } from '../metahub';

export function shouldBehaveLikeAssetManager(): void {
  // eslint-disable-next-line sonarjs/cognitive-complexity
  describe.only('AssetManager', function () {
    let assetManager: IAssetManager;
    let assetClassRegistry: IAssetClassRegistry;
    let originalAsset: ERC721Mock;
    let warperManager: IWarperManager;
    let metahub: IMetahub;
    let warperPresetFactory: IWarperPresetFactory;
    let universeRegistry: IUniverseRegistry;
    let universeId: BigNumberish;

    beforeEach(async function () {
      assetManager = this.contracts.assetManager;
      warperManager = this.contracts.warperManager;
      assetClassRegistry = this.contracts.assetClassRegistry;
      originalAsset = this.mocks.assets.erc721;
      metahub = this.contracts.metahub;
      universeRegistry = this.contracts.universeRegistry;
      warperPresetFactory = this.contracts.warperPresetFactory;

      universeId = await createUniverse(universeRegistry, {
        name: 'Universe',
        rentalFeePercent: 1000,
      });
    });

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
          controller: classConfig.controller,
          original,
          name,
          universeId,
          paused,
          assetClass: ASSET_CLASS.ERC721,
        };
      }
      return result;
    };

    describe('registerAsset', () => {
      context('When not called by WarperManager', () => {
        it('reverts');
      });

      context('When called by WarperManager', () => {
        context('When asset not registered', () => {
          it('registers asset');
        });

        context('When asset registered', () => {
          it('does not registers asset');
        });
      });
    });

    describe('assetClassController', () => {
      context('asset class not registered', () => {
        it('returns ADDRESS_ZERO');
      });

      context('asset class registered', () => {
        it('returns the controllers address');
      });
    });

    describe('supportedAssetCount', () => {
      context('When warpers are not registered', () => {
        it('returns 0', async () => {
          await expect(assetManager.supportedAssetCount()).to.eventually.eq(0);
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
          await expect(assetManager.supportedAssetCount()).to.eventually.eq(2);
        });
      });
    });

    describe('supportedAssets', () => {
      context('When warpers are not registered', () => {
        it('returns an empty list', async () => {
          await expect(assetManager.supportedAssets(0, 10)).to.eventually.eql([[], []]);
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
          const assetConfig = await assetClassRegistry.assetClassConfig(ASSET_CLASS.ERC721);
          for (let offset = 0; offset < supportedAssets.length; offset += limit) {
            const [supportedAssetAddresses, supportedAssetConfigs] = await assetManager.supportedAssets(offset, limit);
            expect(supportedAssetAddresses).to.eql(supportedAssets.slice(offset, offset + limit));

            const configs: Array<Assets.AssetConfigStruct> = [];
            for (const _expectedConfig of supportedAssetConfigs) {
              configs.push({ ...assetConfig, assetClass: ASSET_CLASS.ERC721 });
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            expect(supportedAssetConfigs).to.containsAllStructs(configs);
          }
        });

        context('Offset larger than total amount', () => {
          it('returns empty arrays', async () => {
            const result = await assetManager.supportedAssets(3, 10);

            expect(result).to.deep.equal([[], []]);
          });
        });
      });
    });

    describe('isWarperAdmin', () => {
      context('When the warper is not registered', () => {
        it('reverts');
      });

      context('When the queried account is not the universe owner', () => {
        it('returns false');
      });

      context('When the queried account is the universe owner', () => {
        it('returns true');
      });
    });
  });
}
