
import { Command } from "commander";
import { promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptUserKeyCustomizationDecision, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";

const UNIVERSAL_WALLET_REACT_REPO_URL = "https://github.com/0xsequence-demos/universal-wallet-react-boilerplate/";

export async function createUniversalWalletReact(program: Command, options: any) {
    let projectAccessKey = options.projectAccessKey;

    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    
    if (userWantsToConfigureTheirKeys) {
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
    }

    console.log("Cloning the repo to `universal-wallet-react-boilerplate`...");

    shell.exec(`git clone ${UNIVERSAL_WALLET_REACT_REPO_URL} universal-wallet-react-boilerplate`, { silent: !options.verbose });
    
    shell.cd("universal-wallet-react-boilerplate");

    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    const envKeys: EnvKeys = {
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Universal Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm dev`, { silent: false });
}