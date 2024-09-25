
import { Command } from "commander";
import { promptForAppleClientIdWithLogs, promptForGoogleClientIdWithLogs, promptForKeyWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptForWalletConnectIdWithLogs, promptUserKeyCustomizationDecision, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";


const EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence/kit-embedded-wallet-react-boilerplate/";


export async function createEmbeddedWalletReact(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;

    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
        walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
    }

    console.log("Cloning the repo to `embedded-wallet-react-boilerplate`...");

    shell.exec(`git clone ${EMBEDDED_WALLET_REACT_REPO_URL} embedded-wallet-react-boilerplate`, { silent: !options.verbose });
    
    shell.cd("embedded-wallet-react-boilerplate");

    
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
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Embedded Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm dev`, { silent: false });
}