import { expect } from 'chai';
import { IUniverseRegistry } from '../../../../typechain';

/**
 * The contract behaves like IUniverseRegistry
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

      context('empty universe name', () => {
        it('reverts', async () => {
          const universeName = '';

          await expect(
            universeRegistry.createUniverse({ name: universeName, rentalFeePercent: 1000 }),
          ).to.be.revertedWith('InvalidUniverseName()');
        });
      });
    });

    describe('setUniverseName', () => {
      const universeName = 'Universe One';
      const universeId = 1;

      beforeEach(async () => {
        await universeRegistry.createUniverse({ name: universeName, rentalFeePercent: 1000 });
      });

      context('Empty universe name', () => {
        it('reverts', async () => {
          const universeName = '';

          await expect(universeRegistry.setUniverseName(universeId, universeName)).to.be.revertedWith(
            'InvalidUniverseName()',
          );
        });
      });

      context('Valid universe name', () => {
        it('emits an event on tx', async () => {
          const universeName = 'Universe One';

          await expect(universeRegistry.setUniverseName(universeId, universeName))
            .to.emit(universeRegistry, `UniverseNameChanged`)
            .withArgs(universeId, universeName);
        });
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
