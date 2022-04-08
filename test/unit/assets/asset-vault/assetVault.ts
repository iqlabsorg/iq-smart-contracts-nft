import hre, { ethers } from 'hardhat';
import { ERC721Mock, IACL, IAssetVault__factory, IERC721AssetVault } from '../../../../typechain';
import { shouldBehaveLikeAssetVault } from './assetVault.behaviour';
import { shouldBehaveLikeERC721AssetVault } from './ERC721AssetVault.behaviour';

export function unitTestAssetVault(): void {
  let acl: IACL;
  async function unitFixtureERC721AssetsVault() {
    // Resolve primary roles
    const operator = await ethers.getNamedSigner('operator');

    const vault = (await hre.run('deploy:erc721-asset-vault', {
      operator: operator.address,
      acl: acl.address,
    })) as IERC721AssetVault;

    const asset = (await hre.run('deploy:mock:ERC721', {
      symbol: 'Test ERC721',
      name: 'ONFT',
    })) as ERC721Mock;

    return {
      vault,
      asset,
    };
  }
  describe('ERC721AssetVault', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;
      const { vault, asset } = await this.loadFixture(unitFixtureERC721AssetsVault);

      this.contracts.assetVault = IAssetVault__factory.connect(vault.address, vault.signer);
      this.contracts.erc721assetVault = vault;
      this.mocks.assets.erc721 = asset;
    });

    shouldBehaveLikeAssetVault();
    shouldBehaveLikeERC721AssetVault();
  });
}
