import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ContractTransaction, Signer } from 'ethers';
import { IACL, IAssetVault, Pausable__factory } from '../../../../typechain';

/**
 * Tests for ERC721 Asset Vault
 */
export function shouldBehaveLikeAssetVault(): void {
  describe('IAssetVault', function () {
    let assetVault: IAssetVault;
    let acl: IACL;
    let stranger: SignerWithAddress;
    let admin: SignerWithAddress;
    let supervisor: SignerWithAddress;
    let operator: SignerWithAddress;

    beforeEach(async function () {
      assetVault = this.contracts.assetVault;
      acl = this.contracts.acl;

      operator = this.signers.named['operator'];
      [stranger, admin, supervisor] = this.signers.unnamed;
      const deployer = this.signers.named['deployer'];

      await acl.connect(deployer).grantRole(await acl.adminRole(), admin.address);
      await acl.connect(deployer).grantRole(await acl.supervisorRole(), supervisor.address);
    });

    function onlyRoleCan(
      tx: (signer: Signer) => Promise<ContractTransaction>,
      successBody: (tx: ContractTransaction, signer: Signer) => Promise<void>,
      roleProvider: () => Promise<[Signer, string]>,
    ) {
      let role: string;
      let signer: Signer;

      beforeEach(async () => {
        [signer, role] = await roleProvider();
      });

      context('When called with the correct role', () => {
        it('called successfully', async () => {
          const cTx = await tx(signer);
          await successBody(cTx, signer);
        });
      });

      context('When called by stranger', () => {
        it('reverts', async () => {
          await expect(tx(stranger)).to.be.revertedByACL(stranger.address, role);
        });
      });
    }

    function onlyAdminCan(
      tx: (signer: Signer) => Promise<ContractTransaction>,
      successBody: (tx: ContractTransaction, signer: Signer) => Promise<void>,
    ) {
      onlyRoleCan(tx, successBody, async () => [admin, await acl.adminRole()]);
    }

    function onlySupervisorCan(
      tx: (signer: Signer) => Promise<ContractTransaction>,
      successBody: (tx: ContractTransaction, signer: Signer) => Promise<void>,
    ) {
      onlyRoleCan(tx, successBody, async () => [supervisor, await acl.supervisorRole()]);
    }

    describe('switchToRecoveryMode', () => {
      onlyAdminCan(
        async signer => {
          return await assetVault.connect(signer).switchToRecoveryMode();
        },
        async (tx, signer) => {
          await expect(tx)
            .to.emit(assetVault, 'RecoveryModeActivated')
            .withArgs(await signer.getAddress());

          await expect(assetVault.isRecovery()).to.eventually.equal(true);
        },
      );

      context('When in recovery mode', () => {
        beforeEach(async () => {
          await assetVault.connect(admin).switchToRecoveryMode();
        });

        it('cannot pause', async () => {
          await expect(assetVault.pause()).to.be.revertedWith('VaultIsInRecoveryMode()');
        });

        it('cannot unpause', async () => {
          await expect(assetVault.pause()).to.be.revertedWith('VaultIsInRecoveryMode()');
        });
      });
    });

    describe('pause', () => {
      onlySupervisorCan(
        async signer => {
          return await assetVault.connect(signer).pause();
        },
        async tx => {
          const pausable = Pausable__factory.connect(assetVault.address, assetVault.signer);

          await expect(tx).to.emit(pausable, 'Paused');
          await expect(pausable.paused()).to.eventually.equal(true);
        },
      );
    });

    describe('unpause', () => {
      context('When not paused', () => {
        it('reverts', async () => {
          await expect(assetVault.connect(supervisor).unpause()).to.be.revertedWith('Pausable: not paused');
        });
      });

      context('When paused', () => {
        beforeEach(async () => {
          await assetVault.connect(supervisor).pause();
        });

        onlySupervisorCan(
          async signer => {
            return await assetVault.connect(signer).unpause();
          },
          async tx => {
            const pausable = Pausable__factory.connect(assetVault.address, assetVault.signer);

            await expect(tx).to.emit(pausable, 'Unpaused');
            await expect(pausable.paused()).to.eventually.equal(false);
          },
        );
      });
    });

    describe('assetClass', () => {
      context('not in recovery mode', () => {
        it('returns false', async () => {
          await expect(assetVault.isRecovery()).to.eventually.equal(false);
        });
      });
    });

    describe('metahub', () => {
      it('returns metahub', async () => {
        await expect(assetVault.metahub()).to.eventually.equal(operator.address);
      });
    });
  });
}
