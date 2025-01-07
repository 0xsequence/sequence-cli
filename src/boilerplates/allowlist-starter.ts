import { extractProjectIdFromAccessKey } from "@0xsequence/utils";
import { Command } from "commander";
import {
    checkIfDirectoryExists,
    cliConsole,
    promptForAppleClientIdWithLogs,
    promptForGoogleClientIdWithLogs,
    promptForKeyWithLogs,
    promptForProjectAccessKeyWithLogs,
    promptForWaaSConfigKeyWithLogs,
    promptForWalletConnectIdWithLogs,
    writeDefaultKeysToEnvFileIfMissing,
    writeToEnvFile,
} from '../utils';
import { EnvKeys, WalletTypes } from "../utils/types";
import shell from "shelljs";
import { select } from "@inquirer/prompts";

const ALLOWLIST_STARTER_REPO_URL = "https://github.com/0xsequence-demos/allowlist-starter-boilerplate";
const REPOSITORY_FILENAME = "allowlist-starter-boilerplate";

export async function createAllowlistStarter(program: Command, options: any) {
    let walletType = options.walletType;
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let audienceId = options.audienceId;
    let chainId = options.chainId;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;
    let builderProjectId;

    cliConsole.sectionTitle("Initializing creation process for Allowlist Starter boilerplate 🚀");

    if (!walletType) {
        walletType = await select({
            message:
                "Please provide the Wallet Type for your project.\nFor more information on wallet types: https://docs.sequence.xyz/solutions/wallets/overview",
            choices: [
                {
                    name: "Embedded Wallet",
                    value: WalletTypes.EmbeddedWallet,
                },
                {
                    name: "Universal Wallet",
                    value: WalletTypes.UniversalWallet,
                },
            ],
        });
    }

    projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);

    if (walletType === WalletTypes.EmbeddedWallet) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
        walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
    }
    
    audienceId = await promptForKeyWithLogs(
        {
            key: audienceId,
            inputMessage: 'Audience ID:',
        },
        [
            'Your Audience ID can be found at Builder > Insights > Audience. e.g. https://sequence.build/project/{PROJECT_ID}/audience',
            'To skip and use the default test audience ID, press enter.',
        ]
    );
    chainId = await promptForKeyWithLogs(
        {
            key: chainId,
            inputMessage: 'Chain ID:',
        },
        [
            'Chain ID for the chain you want to use.',
            'To skip and use the default test chain ID, press enter.',
        ]
    );
    
    if (projectAccessKey) {
        builderProjectId = extractProjectIdFromAccessKey(projectAccessKey);
        if (!builderProjectId) {
            console.log("Invalid Project Access Key provided. Please provide a valid Project Access Key.");
            process.exit();
        }
    }

    cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

    shell.exec(`git clone ${ALLOWLIST_STARTER_REPO_URL} ${REPOSITORY_FILENAME}`, { silent: !options.verbose });
    const directoryExists = checkIfDirectoryExists(REPOSITORY_FILENAME);
    if (!directoryExists) {
        cliConsole.error("Repository cloning failed. Please try again.");
        return;
    }
    shell.cd(REPOSITORY_FILENAME);
    shell.exec(`touch .env`, { silent: !options.verbose });

    cliConsole.loading("Configuring your project");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    const envKeysUniversal: EnvKeys = {
        "VITE_WALLET_TYPE": walletType || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_PROJECT_ID": builderProjectId?.toString() || undefined,
        "VITE_AUDIENCE_ID": audienceId || undefined,
        "VITE_CHAIN_ID": chainId || undefined,
    };

    const envKeysWaaS: EnvKeys = {
        "VITE_WALLET_TYPE": walletType || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_PROJECT_ID": builderProjectId?.toString() || undefined,
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_AUDIENCE_ID": audienceId || undefined,
        "VITE_CHAIN_ID": chainId || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_APPLE_CLIENT_ID": appleClientId || undefined,
        "VITE_WALLET_CONNECT_ID": walletConnectId || undefined,
    };

    const envKeys = walletType === WalletTypes.UniversalWallet ? envKeysUniversal : envKeysWaaS;

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    cliConsole.loading("Installing dependencies");

    shell.exec(`pnpm install`, { silent: !options.verbose });

    cliConsole.done("Allowlist Starter boilerplate created successfully!");

    cliConsole.done(`Great! Now you can test the project with your Wallet`);

    cliConsole.loading("Starting development server");

    shell.exec(`pnpm dev`, { silent: false });
}
