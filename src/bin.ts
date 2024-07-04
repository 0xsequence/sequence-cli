#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings'
import { input, password, number } from '@inquirer/prompts'

import figlet from "figlet"

console.log(figlet.textSync("Sequence"))
console.log("")

const program = new Command()

program.version('0.1.0', '-v, --vers', 'Display the current version').action(() => {
    program.help()
})

async function createListings(options: any) {
    let private_key = options.key
    let collection_address = options.address
    let token_id = options.token
    let network = options.network
    let currency = options.currency
    let price = options.price
    let quantity = options.quantity

    if (!private_key) {
        private_key = await password({
            message: 'Enter the private key for the wallet that holds the tokens'
        })
    }

    if (!collection_address) {
        collection_address = await input({
            message: 'Enter the address of the collection contract'
        })
    }

    if (!token_id) {
        token_id = await number({
            message: 'Enter the ID for the token to be listed'
        })
    }

    if (!network) {
        network = await input({
            message: 'Enter the network to be used (mainnet, polygon, etc.)'
        })
    }

    if (!currency) {
        currency = await input({
            message: 'Enter either a well known currency code (USDC, MATIC, etc.) or a token address'
        })
    }

    if (!price) {
        price = await number({
            message: 'Enter the price per token'
        })
    }

    console.log('create-listings', private_key, collection_address, token_id, network, currency, price, quantity)
}

function makeCommandMarketplace() {
    const comm = new Command('marketplace');

    comm.action(() => {
        comm.help();
    })

    comm
    .command('create-listings')
    .option('-k, --key <private_key>', 'Private key for the wallet that holds the tokens')
    .option('-a, --address <collection_address>', 'Address of the collection contract')
    .option('-t, --token <token_id>', 'ID for the token to be listed', parseInt)
    .option('-n, --network <network>', 'Network to be used (mainnet, polygon, etc.)')
    .option('-c, --currency <currency>', 'Either a well known currency code (USDC, MATIC, etc.) or a token address')
    .option('-p, --price <price>', 'Price per token', parseFloat)
    .option('-q, --quantity <quantity>', 'Number of tokens to be listed', parseInt, 1)
    .action(options => {
        createListings(options)
    })

    return comm;
}

program.addCommand(makeCommandMarketplace())

program.parse(process.argv)
