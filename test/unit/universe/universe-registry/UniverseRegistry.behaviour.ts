import { expect } from 'chai';
import { IUniverseRegistry } from '../../../../typechain';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeUniverseRegistry(): void {
  describe('IUniverseRegistry', function () {
    let universeRegistry: IUniverseRegistry;

    beforeEach(function () {
      universeRegistry = this.contracts.universeRegistry;
    });

    describe('createUniverse', () => {
      it('emits event on creation', async () => {
        const universeName = 'Universe One';
        const universeId = 1;

        await expect(universeRegistry.createUniverse({ name: universeName, rentalFeePercent: 1000 }))
          .to.emit(universeRegistry, 'UniverseChanged')
          .withArgs(universeId, universeName);
      });
    });

    describe('universeName', () => {
      const universeName = 'Universe One';
      const universeId = 1;

      context('When Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.createUniverse({ name: universeName, rentalFeePercent: 1000 });
        });

        it('can retrieve universe name', async () => {
          await expect(universeRegistry.universeName(universeId)).to.eventually.eq(universeName);
        });
      });
    });
  });
}
