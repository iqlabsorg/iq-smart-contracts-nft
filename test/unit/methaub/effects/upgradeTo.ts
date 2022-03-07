import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { upgrades } from 'hardhat';
import { Metahub, MetahubV2Mock, MetahubV2Mock__factory, ACL, ACL__factory } from '../../../../typechain';

export function shouldBehaveLikeUpgradeTo(): void {
  describe('upgradeTo', function () {
    let metahub: Metahub;

    let deployer: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(function () {
      metahub = this.contracts.metahub;

      deployer = this.signers.named['deployer'];
      [stranger] = this.signers.unnamed;
    });

    describe('Upgradeability', () => {
      it('forbids unauthorized upgrade', async () => {
        const acl = new ACL__factory(deployer).attach(await metahub.getAcl());
        const admin = await acl.DEFAULT_ADMIN_ROLE();

        await expect(
          upgrades.upgradeProxy(metahub, new MetahubV2Mock__factory(stranger), { unsafeAllow: ['delegatecall'] }),
        ).to.be.revertedWith(`AccessControl: account ${stranger.address.toLowerCase()} is missing role ${admin}`);
      });

      it('allows owner to upgrade', async () => {
        const metahubV2 = (await upgrades.upgradeProxy(metahub, new MetahubV2Mock__factory(deployer), {
          unsafeAllow: ['delegatecall'],
        })) as MetahubV2Mock;
        expect(metahubV2.address).to.eq(metahub.address);
        await expect(metahubV2.version()).to.eventually.eq('V2');
        await expect(metahubV2.warperPresetFactory()).to.eventually.eq(await metahub.warperPresetFactory());
      });
    });
  });
}
