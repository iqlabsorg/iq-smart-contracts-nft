import { ContractFactory } from 'ethers';
import { Libraries, ProxyOptions } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const unsafeDeployment = async <T extends ContractFactory>(
  factory: T,
  name: string,
  hre: HardhatRuntimeEnvironment,
  args: Array<unknown> = [],
  libraries?: Libraries,
  proxyOptions?: ProxyOptions,
): Promise<ReturnType<T['attach']>> => {
  const deployer = await hre.ethers.getNamedSigner('deployer');
  await hre.deployments.delete(`${name}_Proxy`);
  await hre.deployments.delete(`${name}_Implementation`);

  console.log('Unsafe deployment of', name);

  const deployment = await hre.deployments.deploy(name, {
    from: deployer.address,
    log: true,
    proxy: {
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        methodName: 'initialize',
        args: args,
      },
      ...proxyOptions,
    },
    libraries,
    args: [],
  });

  return factory.attach(deployment.address) as ReturnType<T['attach']>;
};
