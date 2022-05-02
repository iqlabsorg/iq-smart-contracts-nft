import hre from 'hardhat';
import { IACL, IUniverseRegistry, IUniverseToken, IUniverseToken__factory } from '../../../../typechain';
import { shouldBehaveLikeUniverseToken } from './universe-token.behaviour';

export function unitTestUniverseToken(): void {
  let acl: IACL;

  async function unitFixtureUniverseToken(): Promise<{
    universeRegistry: IUniverseRegistry;
    universeToken: IUniverseToken;
  }> {
    // Deploy Universe Registry
    const universeRegistry = (await hre.run('deploy:universe-registry', {
      acl: acl.address,
    })) as IUniverseRegistry;

    const universeToken = IUniverseToken__factory.connect(
      await universeRegistry.universeToken(),
      universeRegistry.signer,
    );

    // Set balance to the Universe Registry account, so we can perform the minting operation here.
    await hre.network.provider.send('hardhat_setBalance', [universeRegistry.address, '0x99999999999999999999']);

    return { universeRegistry, universeToken };
  }

  describe('UniverseToken', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;
      const { universeToken, universeRegistry } = await this.loadFixture(unitFixtureUniverseToken);
      this.contracts.universeToken = universeToken;
      this.contracts.universeRegistry = universeRegistry;
    });

    shouldBehaveLikeUniverseToken();
  });
}
