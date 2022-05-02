import { ContractReceipt, ContractTransaction } from 'ethers';
import './deployment/index';
import './misc/interface-printer';

export const wait = async (txPromise: Promise<ContractTransaction>): Promise<ContractReceipt> => {
  return (await txPromise).wait();
};
