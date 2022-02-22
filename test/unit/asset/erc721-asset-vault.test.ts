import { ethers } from 'hardhat';
import { expect } from 'chai';

import { ERC721AssetVault, ERC721AssetVault__factory, ERC721Mock, ERC721Mock__factory } from '../../../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('ERC721 Asset Vault', () => {
  let vault: ERC721AssetVault;
  let asset: ERC721Mock;
  let deployer: SignerWithAddress;
  let operator: SignerWithAddress;
  let assetOwner: SignerWithAddress;

  beforeEach(async () => {
    deployer = await ethers.getNamedSigner('deployer');
    [assetOwner, operator] = await ethers.getSigners();
    vault = await new ERC721AssetVault__factory(deployer).deploy(operator.address);
    asset = await new ERC721Mock__factory(deployer).deploy('Test ERC721', 'ONFT');

    await asset.mint(assetOwner.address, 1);
    await asset.connect(assetOwner).setApprovalForAll(operator.address, true);
  });

  describe('onERC721Received', function () {
    context('when the caller is operator', function () {
      it('accepts ERC721 tokens', async () => {
        await asset
          .connect(operator)
          .functions['safeTransferFrom(address,address,uint256)'](assetOwner.address, vault.address, 1);
        await expect(asset.ownerOf(1)).to.eventually.eq(vault.address);
      });
    });
    context('when the caller is not operator', function () {
      it('rejects ERC721 tokens', async () => {
        await expect(
          asset.functions['safeTransferFrom(address,address,uint256)'](assetOwner.address, vault.address, 1),
        ).to.be.revertedWith('AccessControl');
      });
    });
  });
});
