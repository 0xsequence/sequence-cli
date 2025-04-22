
import { extractProjectIdFromAccessKey } from "@0xsequence/utils";
import { Command } from "commander";
import { checkIfDirectoryExists, cliConsole, promptForAppleClientIdWithLogs, promptForGoogleClientIdWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptForWalletConnectIdWithLogs, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";

const PRIMARY_SALES_ERC1155_REPO_URL = "https://github.com/0xsequence-demos/primary-sale-1155-boilerplate";
const REPOSITORY_FILENAME = "primary-sale-1155-boilerplate";
const REPOSITORY_REFERENCE = "Primary Sales ERC1155 boilerplate";
const SEQUENCE_DOCS_URL = "https://docs.sequence.xyz/";

export async function createPrimarySalesErc1155(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;
    let builderProjectId;

    cliConsole.sectionTitle(`Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`);

    const userWantsToConfigureTheirKeys = false

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
    
    cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

    shell.exec(`git clone ${PRIMARY_SALES_ERC1155_REPO_URL} ${REPOSITORY_FILENAME}`, { silent: !options.verbose });
    
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
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_APPLE_CLIENT_ID": appleClientId || undefined,
        "VITE_WALLET_CONNECT_ID": walletConnectId || undefined,
        "VITE_PROJECT_ID": builderProjectId?.toString() || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    cliConsole.loading("Installing dependencies");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);

    cliConsole.done(`Great! Now you can test the project with your WaaS. If you want to take it to the next level by using your own Primary Sales Contracts in the project, go to the following link and we can set it up: ${SEQUENCE_DOCS_URL}guides/primary-sales`);
    
    cliConsole.loading("Starting development server");
    
    shell.exec(`pnpm dev`, { silent: false });
}