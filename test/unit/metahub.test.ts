import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import {
  ERC721Mock,
  ERC721Mock__factory,
  ERC721Warper,
  ERC721Warper__factory,
  MetaHub,
  MetaHub__factory,
  WarperPresetFactory,
  WarperPresetFactory__factory,
} from '../../typechain';
import { expect } from 'chai';
import { wait } from '../utils';

const { formatBytes32String } = ethers.utils;

describe('MetaHub', () => {
  const warperPresetId = formatBytes32String('ERC721Basic');
  let deployer: SignerWithAddress;
  let nftCreator: SignerWithAddress;
  let erc721Factory: ERC721Mock__factory;
  let oNFT: ERC721Mock;
  let erc721WarperImpl: ERC721Warper;
  let warperPresetFactory: WarperPresetFactory;
  let metaHub: MetaHub;

  before(async () => {
    // Resolve primary roles
    deployer = await ethers.getNamedSigner('deployer');
    nftCreator = await ethers.getNamedSigner('nftCreator');

    // Deploy original NFT
    erc721Factory = new ERC721Mock__factory(nftCreator);
    oNFT = await erc721Factory.deploy('Test ERC721', 'ONFT');
    await oNFT.deployed();

    // Deploy warper preset factory
    warperPresetFactory = await new WarperPresetFactory__factory(deployer).deploy();

    // Deploy and register warper preset
    erc721WarperImpl = await new ERC721Warper__factory(deployer).deploy();
    await warperPresetFactory.addPreset(warperPresetId, erc721WarperImpl.address);

    // Deploy MetaHub
    metaHub = await new MetaHub__factory(deployer).deploy(warperPresetFactory.address);
  });

  it('returns the warper preset factory address', async () => {
    await expect(metaHub.getWarperPresetFactory()).to.eventually.eq(warperPresetFactory.address);
  });

  it('allows to deploy a warper from preset', async () => {
    const receipt = await wait(metaHub.deployWarper(warperPresetId, oNFT.address));

    // Use oNFT interface with warper address.
    const events = await metaHub.queryFilter(metaHub.filters.WarperDeployed(oNFT.address, null), receipt.blockNumber);
    const warper = erc721Factory.attach(events[0].args.warper);

    await expect(warper.name()).to.eventually.eq('Test ERC721');
    await expect(warper.symbol()).to.eventually.eq('ONFT');
  });
});
