import { Command } from 'commander';
import {
  checkIfDirectoryExists,
  cliConsole,
  writeDefaultKeysToEnvFileIfMissing,
  writeToEnvFile,
} from '../utils';

import shell from 'shelljs';
import { EnvKeys } from '../utils/types';

const TRAILS_REPO_URL = 'https://github.com/0xsequence-demos/websdk-trails-starter';
const REPOSITORY_FILENAME = 'websdk-trails-starter';
const REPOSITORY_REFERENCE = 'Web SDK Trails starter';

export async function createWebSdkTrailsStarter(program: Command, options: any) {
  let trailsApiKey = options.trailsApiKey;
  let projectAccessKey = options.projectAccessKey;
  let waasConfigKey = options.waasConfigKey;
  let googleClientId = options.googleClientId;

  cliConsole.sectionTitle(
    `Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`
  );

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
    VITE_PROJECT_ACCESS_KEY: projectAccessKey || undefined,
    VITE_WAAS_CONFIG_KEY: waasConfigKey || undefined,
    VITE_TRAILS_API_KEY: trailsApiKey || undefined,
    VITE_GOOGLE_CLIENT_ID: googleClientId || undefined,
  };

  writeToEnvFile(envKeys, options);
  writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

  cliConsole.loading('Installing dependencies');

  shell.exec(`pnpm install`, { silent: !options.verbose });

  cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);
  cliConsole.loading('Starting development server');

  shell.exec(`pnpm dev`, { silent: false });
}
