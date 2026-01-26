import { Command } from 'commander';
import {
  checkIfDirectoryExists,
  cliConsole,
  promptForChainsWithLogs,
  promptForProjectAccessKeyWithLogs,
  promptForWalletAppUrlWithLogs,
  writeDefaultKeysToEnvFileIfMissing,
  writeToEnvFile,
} from '../utils';
import { EnvKeys } from '../utils/types';

import shell from 'shelljs';

const ECOSYSTEM_WALLET_REACT_REPO_URL =
  'https://github.com/0xsequence-demos/websdk-ecosystem-wallet-react-boilerplate/';
const REPOSITORY_FILENAME = 'websdk-ecosystem-wallet-react-boilerplate';
const REPOSITORY_REFERENCE = 'Web SDK Ecosystem Wallet React boilerplate';

export async function createEcosystemWalletReact(
  program: Command,
  options: any
) {
  let projectAccessKey = options.projectAccessKey;
  let walletAppUrl = options.walletAppUrl;
  let chains = options.chains;

  cliConsole.sectionTitle(
    `Initializing creation process for ${REPOSITORY_REFERENCE}`
  );

  walletAppUrl = await promptForWalletAppUrlWithLogs(walletAppUrl);

  const userWantsToConfigureTheirKeys = false;

  if (userWantsToConfigureTheirKeys) {
    projectAccessKey =
      await promptForProjectAccessKeyWithLogs(projectAccessKey);
    chains = await promptForChainsWithLogs(chains);
  }

  cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

  shell.exec(
    `git clone ${ECOSYSTEM_WALLET_REACT_REPO_URL} ${REPOSITORY_FILENAME}`,
    { silent: !options.verbose }
  );

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
    VITE_PROJECT_ACCESS_KEY: projectAccessKey || undefined,
    VITE_WALLET_APP_URL: walletAppUrl || undefined,
    VITE_CHAINS: chains || 'arbitrum-sepolia',
  };

  if (envKeys.VITE_CHAINS) {
    const chainsArray =
      typeof envKeys.VITE_CHAINS === 'string'
        ? envKeys.VITE_CHAINS.split(',')
        : [];
    envKeys.VITE_DEFAULT_CHAIN = chainsArray[0].trim();
  }

  writeToEnvFile(envKeys, options);
  writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

  cliConsole.loading('Installing dependencies');

  shell.exec(`pnpm install`, { silent: !options.verbose });

  cliConsole.done(`${REPOSITORY_REFERENCE} created successfully!`);
  cliConsole.loading('Starting development server');

  shell.exec(`pnpm dev`, { silent: false });
}
