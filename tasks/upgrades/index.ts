import { task, types } from 'hardhat/config';
import { UUPSUpgradeable__factory } from '../../typechain';
import './metahub';
import './asset-class-registry';

// --------------------------------------- CAUTION ----------------------------------- //
// This command does not rely on OZ upgrades plugin,
// hence does not provide any extra safety check and does not detect storage shifting.
// ----------------------------------------------------------------------------------- //

task('upgrade:unsafe:proxy', 'Upgrade an arbitrary proxy contract.')
  .addParam('proxy', 'The proxy contract address', undefined, types.string)
  .addParam('implementation', 'The implementation address', undefined, types.string)
  .setAction(async ({ proxy, implementation }: { proxy: string; implementation: string }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    const proxyContract = UUPSUpgradeable__factory.connect(proxy, deployer);
    {
      const tx = await proxyContract.upgradeTo(implementation);
      await tx.wait();
    }
  });
