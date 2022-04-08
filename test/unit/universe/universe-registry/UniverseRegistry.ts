import { smock } from '@defi-wonderland/smock';
import hre from 'hardhat';
import { IACL, IUniverseRegistry, Metahub, Metahub__factory } from '../../../../typechain';
import { shouldBehaveLikeUniverseRegistry } from './UniverseRegistry.behaviour';

export function unitTestUniverseRegistry(): void {
  let acl: IACL;

  async function unitFixtureUniverseRegistryMock() {
    // Fake MetaHub
    const metahub = await smock.fake<Metahub>(Metahub__factory);

    // Deploy Universe Token
    const universeRegistry = (await hre.run('deploy:universe-registry', {
      acl: acl.address,
      metahub: metahub.address,
      rentalFeePercent: 100,
    })) as IUniverseRegistry;

    // Set balance to the MetaHub account so we can perform the minting operation here
    await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

    return {
      universeRegistry: universeRegistry,
      metahub: metahub,
    };
  }

  describe('UniverseRegistry', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;

      const { universeRegistry, metahub } = await this.loadFixture(unitFixtureUniverseRegistryMock);
      this.contracts.universeRegistry = universeRegistry;
      this.mocks.metahub = metahub;
    });

    shouldBehaveLikeUniverseRegistry();
  });
}
