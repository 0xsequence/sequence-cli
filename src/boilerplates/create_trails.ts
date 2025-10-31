import { Command } from 'commander';
import { checkIfDirectoryExists, cliConsole } from '../utils';

import shell from 'shelljs';

const TRAILS_REPO_URL = 'https://github.com/0xsequence-demos/trails-starter/';
const REPOSITORY_FILENAME = 'trails-starter';
const REPOSITORY_REFERENCE = 'Trails starter';

export async function createTrailsStarter(program: Command, options: any) {
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

  cliConsole.loading('Installing dependencies');

  shell.exec(`pnpm install`, { silent: !options.verbose });

  cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);
  cliConsole.loading('Starting development server');

  shell.exec(`pnpm dev`, { silent: false });
}
