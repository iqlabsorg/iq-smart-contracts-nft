import { expect } from 'chai';
import { UniverseToken } from '../../../../typechain';

export function shouldBehaveLikeCorrectTokenSymbol(): void {
  let universe: UniverseToken;

  beforeEach(function () {
    universe = this.contracts.universeToken;
  });

  describe('universeName', () => {
    it('has correct token symbol', async () => {
      await expect(universe.symbol()).to.eventually.eq('IQV');
    });
  });
}
