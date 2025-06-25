import { Command } from 'commander';
import {
  checkIfDirectoryExists,
  cliConsole,
  promptForGoogleClientIdWithLogs,
  promptForProjectAccessKeyWithLogs,
  promptForWaaSConfigKeyWithLogs,
  promptForWalletConnectIdWithLogs,
  writeDefaultKeysToEnvFileIfMissing,
  writeToEnvFile,
} from '../utils';
import { EnvKeys } from '../utils/types';

import shell from 'shelljs';

const WALLET_LINKING_EMBEDDED_WALLET_REPO_URL =
  'https://github.com/0xsequence-demos/demo-embedded-wallet-linking';
const REPOSITORY_FILENAME = 'demo-embedded-wallet-linking';
const REPOSITORY_REFERENCE = 'Embedded Wallet Linking React boilerplate';

export async function createWalletLinkingEmbeddedWallet(
  program: Command,
  options: any
) {
  let waasConfigKey = options.waasConfigKey;
  let projectAccessKey = options.projectAccessKey;
  let googleClientId = options.googleClientId;
  let walletConnectId = options.walletConnectId;

  cliConsole.sectionTitle(
    `Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`
  );

  const userWantsToConfigureTheirKeys = false;

  if (userWantsToConfigureTheirKeys) {
    waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
    projectAccessKey =
      await promptForProjectAccessKeyWithLogs(projectAccessKey);
    googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
    walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
  }

  cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

  shell.exec(
    `git clone ${WALLET_LINKING_EMBEDDED_WALLET_REPO_URL} ${REPOSITORY_FILENAME}`,
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
    VITE_WAAS_CONFIG_KEY: waasConfigKey || undefined,
    VITE_PROJECT_ACCESS_KEY: projectAccessKey || undefined,
    VITE_GOOGLE_CLIENT_ID: googleClientId || undefined,
    VITE_WALLET_CONNECT_ID: walletConnectId || undefined,
  };

  writeToEnvFile(envKeys, options);
  writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

  cliConsole.loading('Installing dependencies');

  shell.exec(`pnpm install`, { silent: !options.verbose });

  cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);
  cliConsole.loading('Starting development server');

  shell.exec(`pnpm dev`, { silent: false });
}
