import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IUniverseRegistry } from '../../../../typechain';
import { AddressZero } from '../../../shared/types';

const universeName = 'Universe One';
const universeId = 1;
const universeRentalFeePercent = 1000;

const createUniverseData: IUniverseRegistry.UniverseParamsStruct = {
  name: universeName,
  rentalFeePercent: universeRentalFeePercent,
};

/**
 * The contract behaves like IUniverseRegistry
 */
export function shouldBehaveLikeUniverseRegistry(): void {
  describe('IUniverseRegistry', function () {
    let universeRegistry: IUniverseRegistry;
    let deployer: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(function () {
      universeRegistry = this.contracts.universeRegistry;
      deployer = this.signers.named.deployer;

      [stranger] = this.signers.unnamed;
    });

    describe('createUniverse', () => {
      it('emits event on creation', async () => {
        await expect(universeRegistry.createUniverse(createUniverseData))
          .to.emit(universeRegistry, 'UniverseChanged')
          .withArgs(universeId, universeName);
      });

      context('Empty universe name', () => {
        it('reverts', async () => {
          const universeName = '';

          await expect(
            universeRegistry.createUniverse({ ...createUniverseData, name: universeName }),
          ).to.be.revertedWith('EmptyUniverseName()');
        });
      });
    });

    describe('universeToken', () => {
      it('returns the universe token address', async () => {
        await expect(universeRegistry.universeToken()).to.eventually.not.equal(AddressZero);
      });
    });

    describe('setUniverseName', () => {
      context('Universe created', () => {
        beforeEach(async () => {
          await universeRegistry.createUniverse(createUniverseData);
        });

        context('Empty universe name', () => {
          it('reverts', async () => {
            const universeName = '';

            await expect(universeRegistry.setUniverseName(universeId, universeName)).to.be.revertedWith(
              'EmptyUniverseName()',
            );
          });
        });

        context('Valid universe name', () => {
          it('emits an event on tx', async () => {
            await expect(universeRegistry.setUniverseName(universeId, universeName))
              .to.emit(universeRegistry, `UniverseNameChanged`)
              .withArgs(universeId, universeName);
          });
        });
      });

      context('Universe not created', () => {
        it('reverts', async () => {
          await expect(universeRegistry.setUniverseName(universeId, universeName)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${1})`,
          );
        });
      });
    });

    describe('setUniverseRentalFee', () => {
      const universeRentalFee = 3333;

      context('Universe created', () => {
        beforeEach(async () => {
          await universeRegistry.createUniverse(createUniverseData);
        });

        it('emits an event on tx', async () => {
          await expect(universeRegistry.setUniverseRentalFee(universeId, universeRentalFee))
            .to.emit(universeRegistry, `UniverseRentalFeeChanged`)
            .withArgs(universeId, universeRentalFee);
        });
      });

      context('Universe not created', () => {
        it('reverts', async () => {
          await expect(universeRegistry.setUniverseRentalFee(1, universeRentalFee)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${1})`,
          );
        });
      });
    });

    describe('universeName', () => {
      context('When Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.createUniverse(createUniverseData);
        });

        it('can retrieve universe name', async () => {
          await expect(universeRegistry.universeName(universeId)).to.eventually.eq(universeName);
        });
      });

      context('When Universe not registered', () => {
        it('reverts', async () => {
          await expect(universeRegistry.universeName(universeId)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('isUniverseOwner', () => {
      context('When Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.connect(deployer).createUniverse(createUniverseData);
        });

        it('returns `true` for the real owner', async () => {
          await expect(universeRegistry.isUniverseOwner(universeId, deployer.address)).to.eventually.eq(true);
        });

        it('returns `false` for the wrong owner', async () => {
          await expect(universeRegistry.isUniverseOwner(universeId, stranger.address)).to.eventually.eq(false);
        });
      });

      context('When Universe not registered', () => {
        it('reverts', async () => {
          await expect(universeRegistry.isUniverseOwner(universeId, stranger.address)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('checkUniverseOwner', () => {
      context('When Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.connect(deployer).createUniverse(createUniverseData);
        });

        it('returns `true` for the real owner', async () => {
          await expect(universeRegistry.checkUniverseOwner(universeId, deployer.address)).to.not.be.reverted;
        });

        it('returns `false` for the wrong owner', async () => {
          await expect(universeRegistry.checkUniverseOwner(universeId, stranger.address)).to.be.revertedWith(
            `AccountIsNotUniverseOwner(\\"${stranger.address}\\")`,
          );
        });
      });

      context('When Universe not registered', () => {
        it('reverts', async () => {
          await expect(universeRegistry.checkUniverseOwner(universeId, stranger.address)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('universeOwner', () => {
      context('When Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.connect(deployer).createUniverse(createUniverseData);
        });

        it('returns the real owner', async () => {
          await expect(universeRegistry.universeOwner(universeId)).to.eventually.eq(deployer.address);
        });
      });

      context('When Universe not registered', () => {
        it('reverts', async () => {
          await expect(universeRegistry.universeOwner(universeId)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('universeFeePercent', () => {
      context('When Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.connect(deployer).createUniverse(createUniverseData);
        });

        it('returns the real owner', async () => {
          await expect(universeRegistry.universeFeePercent(universeId)).to.eventually.eq(universeRentalFeePercent);
        });
      });

      context('When Universe not registered', () => {
        it('reverts', async () => {
          await expect(universeRegistry.universeFeePercent(universeId)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('universe', () => {
      context('When Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.connect(deployer).createUniverse(createUniverseData);
        });

        it('returns the real owner', async () => {
          await expect(universeRegistry.universe(universeId)).to.eventually.equalStruct({
            name: 'IQVerse',
            symbol: 'IQV',
            universeName,
            rentalFeePercent: universeRentalFeePercent,
          });
        });
      });

      context('When Universe not registered', () => {
        it('reverts', async () => {
          await expect(universeRegistry.universe(universeId)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });
  });
}
