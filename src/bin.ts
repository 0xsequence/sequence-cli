#!/usr/bin/env node

import { Command } from 'commander';
import figlet from "figlet"

console.log(figlet.textSync("Sequence"))
console.log("")

const program = new Command()

program.action(() => {
	program.help()
})

function makeCommandMarketplace() {
	const opt = new Command('marketplace');

	opt.action(() => {
		opt.help();
	})

	opt.command('create-listings').action(() => {
		console.log('create listings');
	})

	return opt;
}
program.addCommand(makeCommandMarketplace())

program.parse(process.argv)
