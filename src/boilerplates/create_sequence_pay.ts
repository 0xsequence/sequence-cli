import { Command } from "commander";
import {
    checkIfDirectoryExists,
    cliConsole,
    promptForAppleClientIdWithLogs,
    promptForGoogleClientIdWithLogs,
    promptForProjectAccessKeyWithLogs,
    promptForWaaSConfigKeyWithLogs,
    promptForWalletConnectIdWithLogs,
    writeDefaultKeysToEnvFileIfMissing,
    writeToEnvFile,
} from '../utils';
import { EnvKeys } from "../utils/types";
import shell from "shelljs";

const SEQUENCE_PAY_REPO_URL = "https://github.com/0xsequence-demos/sequence-pay-boilerplate";
const REPOSITORY_FILENAME = "sequence-pay-boilerplate";
const REPOSITORY_REFERENCE = "Sequence Pay boilerplate";
const SEQUENCE_DOCS_URL = "https://docs.sequence.xyz/";

export async function createSequencePay(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;

    cliConsole.sectionTitle(`Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`);

    const userWantsToConfigureTheirKeys = false
    
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
        walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
    }

    cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

    shell.exec(`git clone ${SEQUENCE_PAY_REPO_URL} ${REPOSITORY_FILENAME}`, { silent: !options.verbose });

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

    const envKeys: EnvKeys = {
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_APPLE_CLIENT_ID": appleClientId || undefined,
        "VITE_WALLET_CONNECT_ID": walletConnectId || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    cliConsole.loading("Installing dependencies");

    shell.exec(`pnpm install`, { silent: !options.verbose });

    cliConsole.done(`${REPOSITORY_REFERENCE} created successfully!`);

    cliConsole.done(`Great! Now you can test the project with your Embedded Wallet. Here is the guide for the repository ${SEQUENCE_DOCS_URL}solutions/wallets/sequence-kit/checkout`);

    cliConsole.loading("Starting development server");

    cliConsole.info(`To know how to use this repository please go to the following link ${SEQUENCE_DOCS_URL}solutions/wallets/sequence-kit/checkout`);

    shell.exec(`pnpm dev`, { silent: false });
}
