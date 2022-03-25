import hre, { ethers } from 'hardhat';
import { ACL__factory, ERC721AssetVault__factory, ERC721Mock__factory } from '../../../../typechain';
import { shouldBehaveLikeAssetVault } from './assetVault.behaviour';
import { shouldBehaveLikeERC721AssetVault } from './ERC721AssetVault.behaviour';

export async function unitFixtureERC721AssetsVault() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const operator = await ethers.getNamedSigner('operator');

  const deployedACL = await hre.run('deploy:acl');

  const deployedERC721AssetVault = await hre.run('deploy:erc721-asset-vault', {
    operator: operator.address,
    acl: deployedACL,
  });
  const deployedERC721 = await hre.run('deploy:mock:ERC721', {
    symbol: 'Test ERC721',
    name: 'ONFT',
  });

  return {
    vault: new ERC721AssetVault__factory(deployer).attach(deployedERC721AssetVault),
    asset: new ERC721Mock__factory(deployer).attach(deployedERC721),
    acl: new ACL__factory(deployer).attach(deployedACL),
  };
}

export function unitTestAssetVault(): void {
  describe('ERC721AssetVault', function () {
    beforeEach(async function () {
      const { vault, asset } = await this.loadFixture(unitFixtureERC721AssetsVault);
      this.contracts.erc721assetVault = vault;
      this.mocks.assets.erc721 = asset;
    });

    shouldBehaveLikeAssetVault();
    shouldBehaveLikeERC721AssetVault();
  });
}
