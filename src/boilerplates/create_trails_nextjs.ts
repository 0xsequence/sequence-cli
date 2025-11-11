import { Command } from 'commander';
import {
  checkIfDirectoryExists,
  cliConsole,
  promptForTrailsApiKeyWithLogs,
  writeDefaultKeysToEnvFileIfMissing,
  writeToEnvFile,
} from '../utils';

import shell from 'shelljs';
import { EnvKeys } from '../utils/types';

const TRAILS_REPO_URL =
  'https://github.com/0xsequence-demos/trails-nextjs-starter/';
const REPOSITORY_FILENAME = 'trails-nextjs-starter';
const REPOSITORY_REFERENCE = 'Trails Nextjs starter';

export async function createTrailsNextjsStarter(
  program: Command,
  options: any
) {
  let trailsApiKey = options.trailsApiKey;

  cliConsole.sectionTitle(
    `Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`
  );

  const userWantsToConfigureTheirKeys = true;

  if (userWantsToConfigureTheirKeys) {
    trailsApiKey = await promptForTrailsApiKeyWithLogs(trailsApiKey);
    if (!trailsApiKey) {
      cliConsole.info('You left the Trails API key empty in your .env file.');
      cliConsole.info(
        'Remember to go back and add your API key later so the project works properly.'
      );
    }
  }

  cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

  shell.exec(`git clone ${TRAILS_REPO_URL} ${REPOSITORY_FILENAME}`, {
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
    NEXT_PUBLIC_TRAILS_API_KEY: trailsApiKey || undefined,
  };

  writeToEnvFile(envKeys, options);
  writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

  cliConsole.loading('Installing dependencies');

  shell.exec(`pnpm install`, { silent: !options.verbose });

  cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);
  cliConsole.loading('Starting development server');

  shell.exec(`pnpm dev`, { silent: false });
}
