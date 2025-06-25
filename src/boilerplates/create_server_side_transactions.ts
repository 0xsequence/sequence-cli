import { Command } from 'commander';
import {
  checkIfDirectoryExists,
  cliConsole,
  isValidPrivateKey,
  promptForKeyWithLogs,
  promptForProjectAccessKeyWithLogs,
  writeDefaultKeysToEnvFileIfMissing,
  writeToEnvFile,
} from '../utils';
import { EnvKeys } from '../utils/types';

import shell from 'shelljs';

const TX_MANAGER_REPO_URL =
  'https://github.com/0xsequence-demos/server-side-transactions-boilerplate';
const REPOSITORY_FILENAME = 'server-side-transactions-boilerplate';
const REPOSITORY_REFERENCE = 'Server side transactions boilerplate';

export async function createServerSideTx(program: Command, options: any) {
  let privateKey = options.key;
  let projectAccessKey = options.projectAccessKey;

  cliConsole.sectionTitle(
    `Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`
  );

  const userWantsToConfigureTheirKeys = false;

  if (userWantsToConfigureTheirKeys) {
    privateKey = await promptForKeyWithLogs(
      { key: privateKey, inputMessage: 'EVM Private Key:' },
      [
        'Please provide a relayer private key for your project.',
        'You can obtain one for demo purposes here https://sequence-ethauthproof-viewer.vercel.app/',
        'To skip and use the default evm private key, press enter.',
        '',
        "Note: This private key's computed Sequence Wallet Address will have to have a Minter Role Granted on a Sequence standard contract in order for minting to work.",
      ]
    );

    if (!isValidPrivateKey(privateKey) && privateKey) {
      program.error('Please input a valid EVM Private key');
    }

    console.log('');

    projectAccessKey =
      await promptForProjectAccessKeyWithLogs(projectAccessKey);
  }

  cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

  shell.exec(`git clone ${TX_MANAGER_REPO_URL} ${REPOSITORY_FILENAME}`, {
    silent: !options.verbose,
  });

  const directoryExists = checkIfDirectoryExists(REPOSITORY_FILENAME);

  if (!directoryExists) {
    cliConsole.error('Repository cloning failed. Please try again.');
    return;
  }

  shell.cd(REPOSITORY_FILENAME);

  shell.exec(`touch .env`, { silent: !options.verbose });

  cliConsole.loading('Configuring your project');

  const envExampleContent = shell.cat('.env.example').toString();
  const envExampleLines = envExampleContent.split('\n');

  const envKeys: EnvKeys = {
    PROJECT_ACCESS_KEY: privateKey || undefined,
    EVM_PRIVATE_KEY: projectAccessKey || undefined,
  };

  writeToEnvFile(envKeys, options);
  writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

  cliConsole.loading('Installing dependencies');

  shell.exec(`pnpm install`, { silent: !options.verbose });

  cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);
  cliConsole.loading('Starting development server');

  shell.exec(`pnpm start`, { silent: false });
}
