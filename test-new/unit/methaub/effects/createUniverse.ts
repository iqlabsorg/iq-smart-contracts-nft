import { expect } from 'chai';
import { Metahub, UniverseToken } from '../../../../typechain';

export function shouldBehaveLikeCreateUniverse(): void {
  describe('createUniverse', function () {
    let metahub: Metahub;
    let universeToken: UniverseToken;

    beforeEach(function () {
      metahub = this.contracts.metahub;
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
}
