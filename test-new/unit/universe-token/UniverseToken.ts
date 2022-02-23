import { UniverseToken } from '../../../typechain';
import { unitFixtureUniverseTokenMock } from '../../shared/fixtures';
import { shouldBehaveLikeUniverseToken } from './UniverseToken.behaviour';

export function unitTestUniverseToken(): void {
  describe('UniverseToken', function () {
    beforeEach(async function () {
      const { universeToken, metahub } = await this.loadFixture(unitFixtureUniverseTokenMock);
      this.mocks.metahub = metahub;
      this.contracts.universeToken = universeToken as unknown as UniverseToken;
    });

    shouldBehaveLikeUniverseToken();
  });
}
