
import { extractProjectIdFromAccessKey } from "@0xsequence/utils";
import { Command } from "commander";
import { promptForAppleClientIdWithLogs, promptForGoogleClientIdWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptForWalletConnectIdWithLogs, promptUserKeyCustomizationDecision, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";

const NFT_DROP_REPO_URL = "https://github.com/0xsequence/nft-drop-boilerplate";
const SEQUENCE_DOCS_URL = "https://docs.sequence.xyz/";

export async function createNftDrop(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;
    let builderProjectId;

    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();

    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
        walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
        
        if (projectAccessKey) {
            builderProjectId = extractProjectIdFromAccessKey(projectAccessKey);
            if (!builderProjectId) {
                console.log("Invalid Project Access Key provided. Please provide a valid Project Access Key.");
                process.exit();
            }
        }
    }
    
    console.log("Cloning the repo to `nft-drop-boilerplate`...");

    shell.exec(`git clone ${NFT_DROP_REPO_URL} nft-drop-boilerplate`, { silent: !options.verbose });
    
    shell.cd("nft-drop-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    const envKeys: EnvKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_APPLE_CLIENT_ID": appleClientId || undefined,
        "VITE_WALLET_CONNECT_ID": walletConnectId || undefined,
        "VITE_PROJECT_ID": builderProjectId?.toString() || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    // const envKeysWrangler: EnvKeys = {
    //     "compatibility_date = ": waasConfigKey || undefined,
    //     "pages_build_output_dir = ": projectAccessKey || undefined,
    //     "name = ": googleClientId || undefined,
    //     "CHAIN_HANDLE = ": appleClientId || undefined,
    //     "JWT_ACCESS_KEY = ": walletConnectId || undefined,
    //     "PROJECT_ID = ": builderProjectId?.toString() || undefined,
    //     "PROJECT_ACCESS_KEY = ": builderProjectId?.toString() || undefined,
    //     "PASSWORD = ": builderProjectId?.toString() || undefined,
    //     "port = ": builderProjectId?.toString() || undefined,
    // };
    
    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("NFT Drop boilerplate created successfully! 🚀");

    console.log(`Great! Now you can test the project with your WaaS. If you want to take it to the next level by using your own Primary Sales Contracts in the project, go to the following link and we can set it up: ${SEQUENCE_DOCS_URL}guides/primary-sales`);
    
    console.log("Starting development server...");
    
    shell.exec(`pnpm dev`, { silent: false });
}