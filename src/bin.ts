#!/usr/bin/env node

import { Command } from 'commander';
import { makeCommandMarketplace } from './marketplace/marketplace';
import { makeCommandWallet } from './wallet/wallet';
import { makeCommandBoilerplates } from './boilerplates/boilerplates';

import figlet from 'figlet';

console.log(figlet.textSync('Sequence'));
console.log('');

const program = new Command();

program
  .version('0.6.0', '-v, --version', 'Display the current version')
  .action(() => {
    program.help();
  });

program.addCommand(makeCommandMarketplace(program));
program.addCommand(makeCommandWallet(program));
program.addCommand(makeCommandBoilerplates(program));

program.parse(process.argv);
