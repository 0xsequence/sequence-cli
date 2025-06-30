import { Command } from 'commander';
import {
  checkIfDirectoryExists,
  cliConsole,
  promptForAppleClientIdWithLogs,
  promptForGoogleClientIdWithLogs,
  promptForKeyWithLogs,
  promptForProjectAccessKeyWithLogs,
  promptForWaaSConfigKeyWithLogs,
  promptUserKeyCustomizationDecision,
  writeDefaultKeysToEnvFileIfMissing,
  writeToEnvFile,
} from '../utils';
import { EnvKeys, WalletTypes } from '../utils/types';

import shell from 'shelljs';

const MARKETPLACE_BOILERPLATE_REPO_URL =
  'https://github.com/0xsequence/marketplace-boilerplate';
const REPOSITORY_FILENAME = 'marketplace-boilerplate';
const REPOSITORY_REFERENCE = 'Marketplace boilerplate';
const envKeysExample = {
  projectAccessKey: 'AQAAAAAAAKD0thGRWyQ1qA4y857JdoKLNs4',
  projectId: '41204',
};

export async function createMarketplaceBoilerplate(
  program: Command,
  options: any
) {
  const walletType = WalletTypes.EmbeddedWallet;
  let waasConfigKey = options.waasConfigKey;
  let projectAccessKey = options.projectAccessKey;
  let googleClientId = options.googleClientId;
  let projectId = options.projectId;
  let appleClientId = options.appleClientId;

  cliConsole.sectionTitle(
    `Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`
  );

  const userWantsToConfigureTheirKeys = false;

  if (userWantsToConfigureTheirKeys) {
    {
      projectAccessKey =
        await promptForProjectAccessKeyWithLogs(projectAccessKey);

      projectId = await promptForKeyWithLogs(
        { key: projectId, inputMessage: 'Project ID:' },
        [
          'Please provide the Project ID from your project.',
          'Your Project ID can be found in the URL within https://sequence.build, either in the cards of your projects or by entering one of the projects where it can also be found in the URL.',
          'To skip and use the default test projectId, press enter.',
        ]
      );

      if (walletType === WalletTypes.EmbeddedWallet) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
      }
    }
  }

  cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

  shell.exec(
    `git clone ${MARKETPLACE_BOILERPLATE_REPO_URL} ${REPOSITORY_FILENAME}`,
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
    NEXT_PUBLIC_ACCESS_KEY:
      projectAccessKey || envKeysExample.projectAccessKey || undefined,
    NEXT_PUBLIC_PROJECT_ID: projectId || envKeysExample.projectId || undefined,
  };

  writeToEnvFile(envKeys, options);
  writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

  cliConsole.loading('Installing dependencies');

  shell.exec(`pnpm install`, { silent: !options.verbose });

  cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);
  cliConsole.loading('Starting development server');

  shell.exec(`pnpm dev`, { silent: false });
}
