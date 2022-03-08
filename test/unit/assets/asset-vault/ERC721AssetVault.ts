import { ethers } from 'hardhat';
import { ACL__factory, ERC721AssetVault__factory, ERC721Mock__factory } from '../../../../typechain';
import { shouldBehaveLikeERC721AssetVault } from './ERC721AssetVault.behaviour';

export async function unitFixtureERC721AssetsVault() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const operator = await ethers.getNamedSigner('operator');

  const acl = await new ACL__factory(deployer).deploy();

  const vault = await new ERC721AssetVault__factory(deployer).deploy(operator.address, acl.address);
  const asset = await new ERC721Mock__factory(deployer).deploy('Test ERC721', 'ONFT');

  return { vault, asset, acl };
}

export function unitTestERC721AssetVault(): void {
  describe('ERC721AssetVault', function () {
    beforeEach(async function () {
      const { vault, asset } = await this.loadFixture(unitFixtureERC721AssetsVault);
      this.contracts.erc721assetVault = vault;
      this.mocks.assets.erc721 = asset;
    });

    shouldBehaveLikeERC721AssetVault();
  });
}
