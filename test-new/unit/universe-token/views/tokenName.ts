import { expect } from 'chai';
import { UniverseToken } from '../../../../typechain';

export function shouldBehaveLikeCorrectTokenName(): void {
  let universe: UniverseToken;

  beforeEach(function () {
    universe = this.contracts.universeToken;
  });

  describe('universeName', () => {
    it('has correct token name', async () => {
      await expect(universe.name()).to.eventually.eq('IQVerse');
    });
  });
}
