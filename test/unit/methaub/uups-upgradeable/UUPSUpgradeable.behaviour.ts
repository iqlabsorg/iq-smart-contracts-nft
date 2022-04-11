import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { upgrades } from 'hardhat';
import {
  Listings__factory,
  MetahubV2Mock,
  MetahubV2Mock__factory,
  Rentings__factory,
  UUPSUpgradeable,
  Warpers__factory,
} from '../../../../typechain';
import { MetahubLibraryAddresses } from '../../../../typechain/factories/Metahub__factory';
import { AccessControlledHelper } from '../../../shared/utils';

// TODO make this generic so it can be re-used for multiple contracts

export function shouldBehaveLikeUUPSUpgradeable(): void {
  describe('UUPS Upgradeable', function () {
    let upgradeable: UUPSUpgradeable;
    let metahubV2Factory: MetahubV2Mock__factory;

    let deployer: SignerWithAddress;

    beforeEach(async function () {
      upgradeable = this.contracts.uupsUpgradeable;

      deployer = this.signers.named.deployer;

      // Deploy external libraries used by Metahub.
      const rentingsLib = await new Rentings__factory(deployer).deploy();
      const listingsLib = await new Listings__factory(deployer).deploy();
      const warpersLib = await new Warpers__factory(deployer).deploy();

      const metahubLibs: MetahubLibraryAddresses = {
        ['contracts/renting/Rentings.sol:Rentings']: rentingsLib.address,
        ['contracts/listing/Listings.sol:Listings']: listingsLib.address,
        ['contracts/warper/Warpers.sol:Warpers']: warpersLib.address,
      };

      metahubV2Factory = new MetahubV2Mock__factory(metahubLibs, deployer);
    });

    describe('upgradeTo', () => {
      AccessControlledHelper.onlyAdminCan(async signer => {
        const metahubV2 = (await upgrades.upgradeProxy(upgradeable, metahubV2Factory.connect(signer), {
          unsafeAllow: ['delegatecall', 'external-library-linking'],
        })) as MetahubV2Mock;
        expect(metahubV2.address).to.eq(upgradeable.address);
        await expect(metahubV2.version()).to.eventually.eq('V2');
      });
    });
  });
}
