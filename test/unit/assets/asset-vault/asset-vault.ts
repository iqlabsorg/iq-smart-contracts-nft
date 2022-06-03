/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import hre, { ethers } from 'hardhat';
import { IACL, IAssetVault__factory, IERC721AssetVault } from '../../../../typechain';
import { shouldBehaveLikeAssetVault } from './asset-vault.behaviour';
import { shouldBehaveLikeERC721AssetVault } from './erc721-asset-vault.behaviour';

export function unitTestAssetVault(): void {
  let acl: IACL;
  async function unitFixtureERC721AssetsVault(): Promise<{ vault: any; asset: any; erc20Mock: any }> {
    // Resolve primary roles
    const operator = await ethers.getNamedSigner('operator');

    const vault = (await hre.run('deploy:erc721-asset-vault', {
      operator: operator.address,
      acl: acl.address,
    })) as IERC721AssetVault;

    const asset = await hre.run('deploy:mock:ERC721', {
      symbol: 'Test ERC721',
      name: 'ONFT',
    });

    const erc20Mock = await hre.run('deploy:mock:ERC20', {
      name: 'Random ERC20',
      symbol: 'TST',
      decimals: 18,
      totalSupply: 100000,
    });

    return {
      vault,
      erc20Mock,
      asset,
    };
  }
  describe('ERC721AssetVault', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;
      const { vault, asset, erc20Mock } = await this.loadFixture(unitFixtureERC721AssetsVault);

      this.contracts.assetVault = IAssetVault__factory.connect(vault.address, vault.signer);
      this.contracts.erc721assetVault = vault;
      this.mocks.assets.erc721 = asset;
      this.mocks.assets.erc20 = erc20Mock;
    });

    shouldBehaveLikeAssetVault();
    shouldBehaveLikeERC721AssetVault();
  });
}
