import { expect } from 'chai';
import { IUniverseManager, UniverseToken } from '../../../../typechain';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeUniverseManager(): void {
  describe('IUniverseManager', function () {
    describe('get warperPresetFactory', function () {
      let metahub: IUniverseManager;
      let universeToken: UniverseToken;

      beforeEach(function () {
        metahub = this.contracts.metahub as unknown as IUniverseManager;
        universeToken = this.contracts.universeToken;
      });

      it('can create universe', async () => {
        const universeName = 'Universe One';
        const universeId = 1;

        await expect(metahub.createUniverse(universeName))
          .to.emit(metahub, 'UniverseCreated')
          .withArgs(universeId, universeName);
        await expect(universeToken.universeName(universeId)).to.eventually.eq(universeName);
      });
    });
  });
}
