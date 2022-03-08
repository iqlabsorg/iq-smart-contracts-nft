import { smock } from '@defi-wonderland/smock';
import hre, { ethers } from 'hardhat';
import { Metahub, Metahub__factory, UniverseToken, UniverseToken__factory } from '../../../typechain';
import { shouldBehaveLikeUniverseToken } from './UniverseToken.behaviour';

export async function unitFixtureUniverseTokenMock() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);

  // Deploy Universe token.
  const universeTokenFactory = new UniverseToken__factory(deployer);
  const universeToken = await universeTokenFactory.deploy(metahub.address);

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
