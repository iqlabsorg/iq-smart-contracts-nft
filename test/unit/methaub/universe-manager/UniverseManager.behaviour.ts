import { expect } from 'chai';
import { IUniverseManager, IUniverseToken } from '../../../../typechain';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeUniverseManager(): void {
  describe('IUniverseManager', function () {
    let universeManager: IUniverseManager;
    let universeToken: IUniverseToken;

    beforeEach(function () {
      universeManager = this.contracts.universeManager;
      universeToken = this.contracts.universeToken;
    });

    context('createUniverse', () => {
      it('emits event on creation', async () => {
        const universeName = 'Universe One';
        const universeId = 1;

        await expect(universeManager.createUniverse({ name: universeName, rentalFeePercent: 1000 }))
          .to.emit(universeManager, 'UniverseCreated')
          .withArgs(universeId, universeName);
      });
    });

    context('universeName', () => {
      const universeName = 'Universe One';
      const universeId = 1;

      beforeEach(async () => {
        await universeManager.createUniverse({ name: universeName, rentalFeePercent: 1000 });
      });

      it('can retrieve universe name', async () => {
        await expect(universeToken.universeName(universeId)).to.eventually.eq(universeName);
      });
    });
  });
}
