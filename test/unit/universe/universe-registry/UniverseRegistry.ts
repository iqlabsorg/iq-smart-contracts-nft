import { smock } from '@defi-wonderland/smock';
import hre, { ethers } from 'hardhat';
import {
  IUniverseRegistry__factory,
  Metahub,
  Metahub__factory,
  UniverseRegistry__factory,
} from '../../../../typechain';
import { shouldBehaveLikeUniverseRegistry } from './UniverseRegistry.behaviour';

export async function unitFixtureUniverseRegistryMock() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);

  // Deploy Universe Token
  const universeRegistry = new UniverseRegistry__factory(deployer).attach(
    await hre.run('deploy:universe-registry', {
      acl: await hre.run('deploy:acl'),
      metahub: metahub.address,
      rentalFeePercent: 100,
    }),
  );

  // Set balance to the MetaHub account so we can perform the minting operation here
  await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

  return {
    universeRegistry: universeRegistry,
    metahub: metahub,
  };
}

export function unitTestUniverseRegistry(): void {
  describe('UniverseRegistry', function () {
    beforeEach(async function () {
      const { universeRegistry, metahub } = await this.loadFixture(unitFixtureUniverseRegistryMock);
      this.contracts.universeRegistry = IUniverseRegistry__factory.connect(
        universeRegistry.address,
        universeRegistry.signer,
      );
      this.mocks.metahub = metahub;
    });

    shouldBehaveLikeUniverseRegistry();
  });
}
