
import { Command } from "commander";
import { promptForGoogleClientIdWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptForWalletConnectIdWithLogs, promptUserKeyCustomizationDecision, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";

const WALLET_LINKING_EMBEDDED_WALLET_REPO_URL = "https://github.com/0xsequence-demos/demo-embedded-wallet-linking";

export async function createWalletLinkingEmbeddedWallet(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let walletConnectId = options.walletConnectId;

    const userWantsToConfigureTheirKeys = false
    
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
    }

    console.log("Cloning the repo to `demo-embedded-wallet-linking`...");

    shell.exec(`git clone ${WALLET_LINKING_EMBEDDED_WALLET_REPO_URL} demo-embedded-wallet-linking`, { silent: !options.verbose });
    
    shell.cd("demo-embedded-wallet-linking");
    
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    const envKeys: EnvKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_WALLET_CONNECT_ID": walletConnectId || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Embedded Wallet Linking React boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm dev`, { silent: false });
}