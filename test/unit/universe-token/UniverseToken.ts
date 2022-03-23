import { smock } from '@defi-wonderland/smock';
import hre, { ethers, upgrades } from 'hardhat';
import { wait } from '../../../tasks';
import { ACL__factory, Metahub, Metahub__factory, UniverseToken, UniverseToken__factory } from '../../../typechain';
import { shouldBehaveLikeUniverseToken } from './UniverseToken.behaviour';

export async function unitFixtureUniverseTokenMock() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);

  // Deploy ACL
  const acl = await new ACL__factory(deployer).deploy();

  // Deploy Universe token.
  const universeToken = (await upgrades.deployProxy(new UniverseToken__factory(deployer), [], {
    kind: 'uups',
    initializer: false,
    unsafeAllow: ['delegatecall'],
  })) as UniverseToken;

  // Initialize Universe token.
  await wait(universeToken.initialize(metahub.address, acl.address));

  // Set balance to the MetaHub account so we can perform the minting operation here
  await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

  return {
    universeToken,
    metahub,
  };
}

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
