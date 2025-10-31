import { Command } from 'commander';
import {
  checkIfDirectoryExists,
  cliConsole,
  promptForKeyWithLogs,
  promptForProjectAccessKeyWithLogs,
  promptForWaaSConfigKeyWithLogs,
  writeDefaultKeysToEnvFileIfMissing,
  writeToEnvFile,
} from '../utils';
import { EnvKeys } from '../utils/types';

import shell from 'shelljs';

const EMBEDDED_WALLET_EPIC_NEXTJS_REPO_URL =
  'https://github.com/0xsequence-demos/websdk-embedded-wallet-epic-nextjs-boilerplate/';
const REPOSITORY_FILENAME = 'websdk-embedded-wallet-epic-nextjs-boilerplate';
const REPOSITORY_REFERENCE = 'Web SDK Embedded Wallet Epic Nextjs boilerplate';

export async function createEmbeddedWalletEpicNextjs(
  program: Command,
  options: any
) {
  let waasConfigKey = options.waasConfigKey;
  let projectAccessKey = options.projectAccessKey;
  let chains = options.chains;
  let epicClientId = options.epicClientId;
  let epicClientSecret = options.epicClientSecret;

  cliConsole.sectionTitle(
    `Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`
  );

  const userWantsToConfigureTheirKeys = true;

  if (userWantsToConfigureTheirKeys) {
    waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey, {
      allowEmptyInput: false,
    });
    projectAccessKey = await promptForProjectAccessKeyWithLogs(
      projectAccessKey,
      { allowEmptyInput: false }
    );
    epicClientId = await promptForKeyWithLogs(
      { key: epicClientId, inputMessage: 'Epic Client ID:' },
      [
        'Please provide the Epic Client ID for your project.',
        "If you prefer to leave this empty for now, you can still clone the repository, but you'll need to replace the variables directly in the .env file later.",
      ]
    );
    epicClientSecret = await promptForKeyWithLogs(
      { key: epicClientSecret, inputMessage: 'Epic Client Secret:' },
      [
        'Please provide the Epic Client Secret for your project.',
        "If you prefer to leave this empty for now, you can still clone the repository, but you'll need to replace the variables directly in the .env file later.",
      ]
    );
  }

  cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

  shell.exec(
    `git clone ${EMBEDDED_WALLET_EPIC_NEXTJS_REPO_URL} ${REPOSITORY_FILENAME}`,
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
    NEXT_PUBLIC_WAAS_CONFIG_KEY: waasConfigKey || undefined,
    NEXT_PUBLIC_PROJECT_ACCESS_KEY: projectAccessKey || undefined,
    NEXT_PUBLIC_CHAINS: chains || 'arbitrum-sepolia',
    NEXT_PUBLIC_EPIC_AUTH_URL: undefined,
    EPIC_CLIENT_ID: epicClientId || undefined,
    EPIC_CLIENT_SECRET: epicClientSecret || undefined,
    REDIRECT_URI: undefined,
    FRONTEND_URL: undefined,
  };

  if (envKeys.NEXT_PUBLIC_CHAINS) {
    const chainsArray =
      typeof envKeys.NEXT_PUBLIC_CHAINS === 'string'
        ? envKeys.NEXT_PUBLIC_CHAINS.split(',')
        : [];
    envKeys.NEXT_PUBLIC_DEFAULT_CHAIN = chainsArray[0].trim();
  }

  writeToEnvFile(envKeys, options);
  writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

  cliConsole.loading('Installing dependencies');

  shell.exec(`pnpm install`, { silent: !options.verbose });

  cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);
  cliConsole.loading('Starting development server');

  shell.exec(`pnpm dev`, { silent: false });
}
