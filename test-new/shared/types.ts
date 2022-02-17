import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import type { MockContract, Fixture } from 'ethereum-waffle';
import { constants } from 'ethers';
import { Metahub, ERC721Mock, ERC721WarperMock } from '../../typechain';

declare module 'mocha' {
  interface Context {
    contracts: Contracts;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    mocks: Mocks;
    signers: Signers;
  }
}

export interface Contracts {
  metaHub: Metahub;
  oNFT: ERC721Mock;
  erc721Warper: ERC721WarperMock;
}

export interface Mocks {
  metaHub: MockContract;
  oNFT: MockContract;
}

export interface Signers {
  deployer: SignerWithAddress;
  nftCreator: SignerWithAddress;
  nftTokenOwner: SignerWithAddress;
}

export const AddressZero = constants.AddressZero;
