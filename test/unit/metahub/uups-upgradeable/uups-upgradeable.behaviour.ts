import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import hre, { upgrades } from 'hardhat';
import {
  Accounts__factory,
  Assets__factory,
  Listings__factory,
  MetahubV2Mock,
  MetahubV2Mock__factory,
  Rentings__factory,
  UUPSUpgradeable,
  UUPSUpgradeable__factory,
  Warpers__factory,
} from '../../../../typechain';
import { MetahubLibraryAddresses } from '../../../../typechain/factories/contracts/metahub/Metahub__factory';
import { ADDRESS_ZERO } from '../../../shared/types';
import { AccessControlledHelper } from '../../../shared/utils';

export function shouldBehaveLikeUUPSUpgradeable(): void {
  describe('UUPS Upgradeable', function () {
    let upgradeable: UUPSUpgradeable;
    let metahubV2Factory: MetahubV2Mock__factory;

    let deployer: SignerWithAddress;

    beforeEach(async function () {
      deployer = this.signers.named.deployer;

      upgradeable = UUPSUpgradeable__factory.connect(this.contracts.uupsUpgradeable.address, deployer);

      // Deploy external libraries used by Metahub.
      const metahubLibs = (await hre.run('deploy:metahub-libraries')) as MetahubLibraryAddresses;

      metahubV2Factory = new MetahubV2Mock__factory(metahubLibs, deployer);
    });

    context('upgradeTo', () => {
      let implInstance: MetahubV2Mock;
      beforeEach(async () => {
        implInstance = await metahubV2Factory.deploy();
      });

      AccessControlledHelper.onlyAdminCan(async signer => {
        await upgradeable.connect(signer).upgradeTo(implInstance.address);

        const metahubV2 = metahubV2Factory.attach(upgradeable.address);
        await expect(metahubV2.version()).to.eventually.eq('V2');
      });
    });

    context('hre.upgrades.upgradeProxy', () => {
      AccessControlledHelper.onlyAdminCan(async signer => {
        const metahubV2 = (await upgrades.upgradeProxy(upgradeable, metahubV2Factory.connect(signer), {
          unsafeAllow: ['delegatecall', 'external-library-linking'],
        })) as MetahubV2Mock;
        expect(metahubV2.address).to.eq(upgradeable.address);
      });
    });

    context('using prepared tasks', () => {
      it('upgrade:metahub', async function () {
        // NOTE: we're deploying a new instance of MetahubV2Mock and then upgrading
        // it to Metahub contract because the upgrade task only uses the Metahub
        // contract as the new implementation!

        // Deploy the MetahubV2Mock
        const upgradeable = (await upgrades.deployProxy(metahubV2Factory, [], {
          initializer: false,
          unsafeAllow: ['delegatecall', 'external-library-linking'],
          kind: 'uups',
        })) as MetahubV2Mock;

        await upgradeable.initialize({
          warperPresetFactory: ADDRESS_ZERO,
          universeRegistry: ADDRESS_ZERO,
          listingStrategyRegistry: ADDRESS_ZERO,
          assetClassRegistry: ADDRESS_ZERO,
          acl: this.contracts.acl.address,
          baseToken: ADDRESS_ZERO,
          rentalFeePercent: 100,
        });

        const metahubV2 = (await hre.run('upgrade:metahub', { proxy: upgradeable.address })) as MetahubV2Mock;

        // NOTE: if the lambda function is async then the assertion does not work :)
        // eslint-disable-next-line @typescript-eslint/promise-function-async
        expect(() => metahubV2.version()).to.throw(TypeError); // Method does not exist!
      });

      it('upgrade:unsafe:proxy', async () => {
        // Deploy impl
        const implInstance = await metahubV2Factory.deploy();

        // Upgrade
        await hre.run('upgrade:unsafe:proxy', {
          proxy: upgradeable.address,
          implementation: implInstance.address,
        });
        const metahubV2 = metahubV2Factory.attach(upgradeable.address);

        // Assert
        await expect(metahubV2.version()).to.eventually.eq('V2');
      });
    });
  });
}
