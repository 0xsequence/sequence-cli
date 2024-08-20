import { input } from "@inquirer/prompts";
import { Command } from "commander";

import shell from "shelljs";
import { isValidPrivateKey } from '../utils/'

const TX_MANAGER_REPO_URL = "https://github.com/0xsequence-demos/tx-manager-boilerplate";
const devMode = process.env.DEV === 'true';

export async function createTxManager(program: Command, options: any) {
    let privateKey = options.key;
    let projectAccessKey = options.projectAccessKey;

    if (!privateKey) {
        console.log("Please provide a relayer private key for your project.");
        console.log("You can obtain one for demo purposes here https://sequence-ethauthproof-viewer.vercel.app/");
        console.log("To skip and use the default evm private key, press enter.");
        console.log("");
        console.log("Note: This private key's computed Sequence Wallet Address will have to have a Minter Role Granted on a Sequence standard contract in order for minting to work.");
 
        privateKey = await input({
            message: "EVM Private Key:",
        });

        if(!isValidPrivateKey(privateKey) && privateKey){
            program.error('Please input a valid EVM Private key')
        }

        console.log("");
    }


    if (!projectAccessKey) {
        console.log("Please provide the Project Access Key for your project.");
        console.log("Your access key can be found at https://sequence.build under the project settings.");
        console.log("To skip and use the default test access key, press enter.");
 
        projectAccessKey = await input({
            message: "Project Access Key:",
        });

        console.log("");
    }

    console.log("Cloning the repo to `tx-manager-boilerplate`...");

    shell.exec(`git clone ${TX_MANAGER_REPO_URL} tx-manager-boilerplate`, { silent: !options.verbose });
    
    shell.cd("tx-manager-boilerplate");

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");
    
    devMode && shell.cd("../tx-manager-boilerplate/server"); // for Local Development

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    for (let i = 0; i < envExampleLines.length; i++) {
        if (envExampleLines[i].includes('EVM_PRIVATE_KEY') && privateKey != '' && privateKey != undefined) {
            shell.exec(`echo EVM_PRIVATE_KEY=${privateKey} >> .env`, { silent: !options.verbose });
        }
        else if (envExampleLines[i].includes('PROJECT_ACCESS_KEY') && projectAccessKey != '' && projectAccessKey != undefined) {
            shell.exec(`echo PROJECT_ACCESS_KEY=${projectAccessKey} >> .env`, { silent: !options.verbose });
        }
        else {
            shell.exec(`echo ${envExampleLines[i]} >> .env`, { silent: !options.verbose });
        }
    }

    console.log("Tx Manager boilerplate created successfully! 🔄");
    console.log("Starting development server...");
    
    devMode && shell.cd("../"); // for Local Development
    
    shell.exec(`pnpm start`, { silent: false });
}