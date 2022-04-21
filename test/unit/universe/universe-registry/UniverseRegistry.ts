import hre from 'hardhat';
import { IACL, IUniverseRegistry, IUniverseToken__factory } from '../../../../typechain';
import { shouldBehaveLikeUniverseRegistry } from './UniverseRegistry.behaviour';

export function unitTestUniverseRegistry(): void {
  let acl: IACL;

  async function unitFixtureUniverseRegistry() {
    // Deploy Universe Registry
    const universeRegistry = (await hre.run('deploy:universe-registry', {
      acl: acl.address,
    })) as IUniverseRegistry;

    const universeToken = IUniverseToken__factory.connect(
      await universeRegistry.universeToken(),
      universeRegistry.signer,
    );
    return { universeRegistry, universeToken };
  }

  describe('UniverseRegistry', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;

      const { universeRegistry, universeToken } = await this.loadFixture(unitFixtureUniverseRegistry);
      this.contracts.universeRegistry = universeRegistry;
      this.contracts.universeToken = universeToken;
    });

    shouldBehaveLikeUniverseRegistry();
  });
}
