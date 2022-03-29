import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { upgrades } from 'hardhat';
import { MetahubV2Mock, MetahubV2Mock__factory, UUPSUpgradeable, IACL, ACL } from '../../../../typechain';

// TODO make this generic so it can be re-used for multiple contracts
export function shouldBehaveLikeUUPSUpgradeable(): void {
  describe('upgradeTo', function () {
    let upgradeable: UUPSUpgradeable;
    let acl: IACL;

    let deployer: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(function () {
      upgradeable = this.contracts.uupsUpgradeable;
      acl = this.contracts.acl;

      deployer = this.signers.named['deployer'];
      [stranger] = this.signers.unnamed;
    });

    describe('Upgradeability', () => {
      it('forbids unauthorized upgrade', async () => {
        const admin = await acl.adminRole();

        await expect(
          upgrades.upgradeProxy(upgradeable, new MetahubV2Mock__factory(stranger), { unsafeAllow: ['delegatecall'] }),
        ).to.be.revertedWith(`AccessControl: account ${stranger.address.toLowerCase()} is missing role ${admin}`);
      });

      it('allows owner to upgrade', async () => {
        const metahubV2 = (await upgrades.upgradeProxy(upgradeable, new MetahubV2Mock__factory(deployer), {
          unsafeAllow: ['delegatecall'],
        })) as MetahubV2Mock;
        expect(metahubV2.address).to.eq(upgradeable.address);
        await expect(metahubV2.version()).to.eventually.eq('V2');
      });
    });
  });
}
