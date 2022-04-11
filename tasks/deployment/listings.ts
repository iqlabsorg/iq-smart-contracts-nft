import { task } from 'hardhat/config';
import { FixedPriceListingController__factory } from '../../typechain';

task('deploy:fixed-price-listing-controller', 'Deploy fixed price listing controller').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  // Delete the previous deployment
  await hre.deployments.delete('FixedPriceListingController');

  const deployment = await hre.deployments.deploy('FixedPriceListingController', {
    from: deployer.address,
    args: [],
    log: true,
  });

  return FixedPriceListingController__factory.connect(deployment.address, deployer);
});
