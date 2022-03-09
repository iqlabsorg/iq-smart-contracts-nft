import { expect } from 'chai';
import { IUniverseManager, UniverseToken } from '../../../../typechain';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeUniverseManager(): void {
  describe('IUniverseManager', function () {
    let metahub: IUniverseManager;
    let universeToken: UniverseToken;

    beforeEach(function () {
      metahub = this.contracts.metahub as unknown as IUniverseManager;
      universeToken = this.contracts.universeToken;
    });

    context('createUniverse', () => {
      it('emits event on creation', async () => {
        const universeName = 'Universe One';
        const universeId = 1;

        await expect(metahub.createUniverse(universeName))
          .to.emit(metahub, 'UniverseCreated')
          .withArgs(universeId, universeName);
      });
    });

    context('universeName', () => {
      const universeName = 'Universe One';
      const universeId = 1;

      beforeEach(async () => {
        await metahub.createUniverse(universeName);
      });

      it('can retrieve universe name', async () => {
        await expect(universeToken.universeName(universeId)).to.eventually.eq(universeName);
      });
    });
  });
}
