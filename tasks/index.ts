import chaiAsPromised from 'chai-as-promised';
import { TASK_TEST_SETUP_TEST_ENVIRONMENT } from 'hardhat/builtin-tasks/task-names';
import { subtask } from 'hardhat/config';
import chai from 'chai';

// Override default subtask to add chai plugins
// eslint-disable-next-line require-await
subtask(TASK_TEST_SETUP_TEST_ENVIRONMENT, async (): Promise<void> => {
  chai.use(chaiAsPromised);
});
