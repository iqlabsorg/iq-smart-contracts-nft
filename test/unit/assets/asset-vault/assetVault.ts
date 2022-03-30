import hre, { ethers } from 'hardhat';
import {
  ACL__factory,
  ERC721AssetVault__factory,
  ERC721Mock__factory,
  IACL__factory,
  IAssetVault__factory,
  IERC721AssetVault__factory,
} from '../../../../typechain';
import { shouldBehaveLikeAssetVault } from './assetVault.behaviour';
import { shouldBehaveLikeERC721AssetVault } from './ERC721AssetVault.behaviour';

export async function unitFixtureERC721AssetsVault() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const operator = await ethers.getNamedSigner('operator');

  const deployedACL = await hre.run('deploy:acl');

  return {
    vault: new ERC721AssetVault__factory(deployer).attach(
      await hre.run('deploy:erc721-asset-vault', {
        operator: operator.address,
        acl: deployedACL,
      }),
    ),
    asset: new ERC721Mock__factory(deployer).attach(
      await hre.run('deploy:mock:ERC721', {
        symbol: 'Test ERC721',
        name: 'ONFT',
      }),
    ),
    acl: new ACL__factory(deployer).attach(deployedACL),
  };
}

export function unitTestAssetVault(): void {
  describe('ERC721AssetVault', function () {
    beforeEach(async function () {
      const { vault, asset, acl } = await this.loadFixture(unitFixtureERC721AssetsVault);
      this.contracts.assetVault = IAssetVault__factory.connect(vault.address, vault.signer);
      this.contracts.erc721assetVault = IERC721AssetVault__factory.connect(vault.address, vault.signer);
      this.contracts.acl = IACL__factory.connect(acl.address, acl.signer);
      this.mocks.assets.erc721 = asset;
    });

    shouldBehaveLikeAssetVault();
    shouldBehaveLikeERC721AssetVault();
  });
}
