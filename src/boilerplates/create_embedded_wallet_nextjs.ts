
import { Command } from "commander";
import { promptForAppleClientIdWithLogs, promptForGoogleClientIdWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptForWalletConnectIdWithLogs, promptUserKeyCustomizationDecision, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";


const EMBEDDED_WALLET_NEXTJS_REPO_URL = "https://github.com/0xsequence-demos/kit-embedded-wallet-nextjs-boilerplate/";


export async function createEmbeddedWalletNextjs(program: Command, options: any) {
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

    console.log("Cloning the repo to `kit-embedded-wallet-nextjs-boilerplate`...");

    shell.exec(`git clone ${EMBEDDED_WALLET_NEXTJS_REPO_URL} kit-embedded-wallet-nextjs-boilerplate`, { silent: !options.verbose });
    
    shell.cd("kit-embedded-wallet-nextjs-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    const envKeys: EnvKeys = {
        "NEXT_PUBLIC_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "NEXT_PUBLIC_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "NEXT_PUBLIC_APPLE_CLIENT_ID": appleClientId || undefined,
        "NEXT_PUBLIC_WALLET_CONNECT_ID": walletConnectId || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Kit Embedded Wallet Nextjs boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm dev`, { silent: false });
}