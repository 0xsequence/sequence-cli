import { Command } from 'commander';
import {
  checkIfDirectoryExists,
  cliConsole,
  promptForProjectAccessKeyWithLogs,
  promptForWaaSConfigKeyWithLogs,
  promptUserKeyCustomizationDecision,
  writeDefaultKeysToEnvFileIfMissing,
  writeToEnvFile,
} from '../utils';
import { EnvKeys } from '../utils/types';

import shell from 'shelljs';

const EMAIL_EMBEDDED_WALLET_REACT_REPO_URL =
  'https://github.com/0xsequence-demos/email-embedded-wallet-react-boilerplate';
const REPOSITORY_FILENAME = 'email-embedded-wallet-react-boilerplate';
const REPOSITORY_REFERENCE = 'Email Embedded Wallet React boilerplate';

export async function createEmailEmbeddedWalletReact(
  program: Command,
  options: any
) {
  let waasConfigKey = options.waasConfigKey;
  let projectAccessKey = options.projectAccessKey;

  cliConsole.sectionTitle(
    `Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`
  );

  const userWantsToConfigureTheirKeys = false;

  if (userWantsToConfigureTheirKeys) {
    waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
    projectAccessKey =
      await promptForProjectAccessKeyWithLogs(projectAccessKey);
  }

  cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

  shell.exec(
    `git clone ${EMAIL_EMBEDDED_WALLET_REACT_REPO_URL} ${REPOSITORY_FILENAME}`,
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
  };

  writeToEnvFile(envKeys, options);
  writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

  cliConsole.loading('Installing dependencies...');

  shell.exec(`pnpm install`, { silent: !options.verbose });

  cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);
  cliConsole.loading('Starting development server');

  shell.exec(`pnpm dev`, { silent: false });
}
