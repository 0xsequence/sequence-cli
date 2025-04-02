import { input, confirm } from "@inquirer/prompts";
import { Command } from "commander";
import { isValidPrivateKey, promptForKeyWithLogs, promptForProjectAccessKeyWithLogs, promptUserKeyCustomizationDecision, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";

const TX_MANAGER_REPO_URL = "https://github.com/0xsequence-demos/server-side-transactions-boilerplate";

export async function createServerSideTx(program: Command, options: any) {
    let privateKey = options.key;
    let projectAccessKey = options.projectAccessKey;

    const userWantsToConfigureTheirKeys = false

    if (userWantsToConfigureTheirKeys) {
        privateKey = await promptForKeyWithLogs(
            { key: privateKey, inputMessage: "EVM Private Key:" },
            [
                "Please provide a relayer private key for your project.",
                "You can obtain one for demo purposes here https://sequence-ethauthproof-viewer.vercel.app/",
                "To skip and use the default evm private key, press enter.",
                "",
                "Note: This private key's computed Sequence Wallet Address will have to have a Minter Role Granted on a Sequence standard contract in order for minting to work.",
            ]
        );

        if(!isValidPrivateKey(privateKey) && privateKey){
            program.error('Please input a valid EVM Private key')
        }

        console.log("");
    
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
    }

    console.log("Cloning the repo to `server-side-transactions-boilerplate`...");

    shell.exec(`git clone ${TX_MANAGER_REPO_URL} server-side-transactions-boilerplate`, { silent: !options.verbose });
    
    shell.cd("server-side-transactions-boilerplate");
    
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");
    
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    const envKeys: EnvKeys = {
        "PROJECT_ACCESS_KEY": privateKey || undefined,
        "EVM_PRIVATE_KEY": projectAccessKey || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Server side transactions boilerplate created successfully! 🔄");
    console.log("Starting development server...");
    
    shell.exec(`pnpm start`, { silent: false });
}