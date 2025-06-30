import { Command } from 'commander';
import {
  checkIfDirectoryExists,
  cliConsole,
  promptForAppleClientIdWithLogs,
  promptForGoogleClientIdWithLogs,
  promptForProjectAccessKeyWithLogs,
  promptForWaaSConfigKeyWithLogs,
  promptForWalletConnectIdWithLogs,
  writeDefaultKeysToEnvFileIfMissing,
  writeToEnvFile,
} from '../utils';
import { EnvKeys } from '../utils/types';
import shell from 'shelljs';

const CRYPTO_ONRAMP_REPO_URL =
  'https://github.com/0xsequence-demos/crypto-onramp-boilerplate';
const REPOSITORY_FILENAME = 'crypto-onramp-boilerplate';
const SEQUENCE_DOCS_URL = 'https://docs.sequence.xyz';
const SEQUENCE_DOC_PATH = '/solutions/wallets/sequence-kit/on-ramp';
const REPOSITORY_REFERENCE = 'Crypto On-ramp Boilerplate';

export async function createCryptoOnramp(program: Command, options: any) {
  let waasConfigKey = options.waasConfigKey;
  let projectAccessKey = options.projectAccessKey;
  let googleClientId = options.googleClientId;
  let appleClientId = options.appleClientId;
  let walletConnectId = options.walletConnectId;

  cliConsole.sectionTitle(
    `Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`
  );

  waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
  googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
  appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
  walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
  projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);

  cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

  shell.exec(`git clone ${CRYPTO_ONRAMP_REPO_URL} ${REPOSITORY_FILENAME}`, {
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
    VITE_PROJECT_ACCESS_KEY: projectAccessKey || undefined,
    VITE_WAAS_CONFIG_KEY: waasConfigKey || undefined,
    VITE_GOOGLE_CLIENT_ID: googleClientId || undefined,
    VITE_APPLE_CLIENT_ID: appleClientId || undefined,
    VITE_WALLET_CONNECT_ID: walletConnectId || undefined,
  };

  writeToEnvFile(envKeys, options);
  writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

  cliConsole.loading('Installing dependencies');

  shell.exec(`pnpm install`, { silent: !options.verbose });

  cliConsole.done(`${REPOSITORY_REFERENCE} created successfully!`);

  cliConsole.loading('Starting development server');

  cliConsole.info(
    `To learn how to work with on-ramp, please visit the following link: ${SEQUENCE_DOCS_URL + SEQUENCE_DOC_PATH}`
  );

  shell.exec(`pnpm dev`, { silent: false });
}
