import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { MockContract, smock } from '@defi-wonderland/smock';
import {
  ERC20Mock__factory,
  ERC721Mock,
  ERC721Mock__factory,
  ERC721Warper,
  ERC721Warper__factory,
  Metahub,
  Metahub__factory,
} from '../../typechain';
import { Contract } from 'ethers';

const { AddressZero, MaxUint256 } = ethers.constants;
const { defaultAbiCoder } = ethers.utils;

describe('ERC721 Warper', () => {
  let deployer: SignerWithAddress;
  let nftCreator: SignerWithAddress;
  let oNFT: ERC721Mock;
  let metahub: MockContract<Metahub>;

  before(async () => {
    // Resolve primary roles
    deployer = await ethers.getNamedSigner('deployer');
    nftCreator = await ethers.getNamedSigner('nftCreator');
    // Deploy original NFT
    const erc721Factory = new ERC721Mock__factory(nftCreator);
    oNFT = await erc721Factory.deploy('Test ERC721', 'ONFT');
    await oNFT.deployed();
  });

  beforeEach(async () => {
    // Mock metahub.
    const metahubFactory = await smock.mock<Metahub__factory>('Metahub');
    metahub = await metahubFactory.deploy();
  });

  describe('Warper', () => {
    it('ensures the original NFT interface compatibility', async () => {
      const warperFactory = new ERC721Warper__factory(deployer);
      const erc20Factory = new ERC20Mock__factory(nftCreator);
      const erc20Token = await erc20Factory.deploy('Random ERC20', 'TST', 18, 1);
      const warper = await warperFactory.deploy();

      await expect(
        warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [erc20Token.address, AddressZero])),
      ).to.be.revertedWithError('InvalidOriginalTokenInterface', erc20Token.address, '0x5b5e139f');
    });
  });

  describe('When original NFT is wrapped', () => {
    let warper: ERC721Warper;

    beforeEach(async () => {
      const warperFactory = new ERC721Warper__factory(deployer);
      warper = await warperFactory.deploy();

      await warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]));
    });

    describe('Warper Interface', () => {
      it('returns the original asset address', async () => {
        await expect(warper.__original()).to.eventually.eq(oNFT.address);
      });

      it('returns the metahub address', async () => {
        await expect(warper.__metahub()).to.eventually.eq(metahub.address);
      });

      describe('Rental Params', () => {
        const tests = [
          { param: 'minRentalPeriod', defaultValue: 0 },
          { param: 'maxRentalPeriod', defaultValue: MaxUint256 },
        ];

        tests.forEach(({ param, defaultValue }) => {
          const getter = `__${param}`;
          const setter = `__set${param[0].toUpperCase()}${param.slice(1)}`;

          describe(param, () => {
            it('returns correct default value', async () => {
              await expect((warper as Contract)[getter]()).to.eventually.eq(defaultValue);
            });

            it('allows warper admin to change param value', async () => {
              metahub.isWarperAdmin.returns(true);
              await (warper as Contract)[setter](100);
              await expect((warper as Contract)[getter]()).to.eventually.eq(100);
            });

            it('forbids stranger to change param value', async () => {
              metahub.isWarperAdmin.returns(false);
              await expect((warper as Contract)[setter](100)).to.be.revertedWithError('CallerIsNotWarperAdmin');
            });
          });
        });
      });
    });

    it('can forward the call to the oNFT', async () => {
      await expect(ERC721Mock__factory.connect(warper.address, deployer).symbol()).to.eventually.eq('ONFT');
    });
  });
});
