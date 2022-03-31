import { smock } from '@defi-wonderland/smock';
import hre, { ethers } from 'hardhat';
import { IUniverseToken__factory, Metahub, Metahub__factory, UniverseToken__factory } from '../../../../typechain';
import { shouldBehaveLikeUniverseToken } from './UniverseToken.behaviour';

export async function unitFixtureUniverseTokenMock() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  // Fake MetaHub
  // TODO we need to use another address for this, because metahub does not manage the universe token!
  const metahub = await smock.fake<Metahub>(Metahub__factory);

  // Deploy Universe Token
  const universeToken = await new UniverseToken__factory(deployer).deploy(metahub.address);

  // Set balance to the MetaHub account so we can perform the minting operation here
  await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

  return {
    universeToken: universeToken,
    metahub: metahub,
  };
}

export function unitTestUniverseToken(): void {
  describe('UniverseToken', function () {
    beforeEach(async function () {
      const { universeToken, metahub } = await this.loadFixture(unitFixtureUniverseTokenMock);
      this.contracts.universeToken = IUniverseToken__factory.connect(universeToken.address, universeToken.signer);
      this.mocks.metahub = metahub;
    });

    shouldBehaveLikeUniverseToken();
  });
}
