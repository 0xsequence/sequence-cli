
import { Command } from "commander";
import { extractProjectIdFromAccessKey } from "@0xsequence/utils";
import { checkIfDirectoryExists, cliConsole, promptForGoogleClientIdWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptUserKeyCustomizationDecision, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";


const EMBEDDED_WALLET_VERIFY_SESSION_REPO_URL = "https://github.com/0xsequence-demos/embedded-wallet-verify-session";
const REPOSITORY_FILENAME = "embedded-wallet-verify-session-boilerplate";
const REPOSITORY_REFERENCE = "Embedded Wallet Verify Session boilerplate";

export async function createEmbeddedWalletVerifySession(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let builderProjectId;

    cliConsole.sectionTitle(`Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`);

    const userWantsToConfigureTheirKeys = false

    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        
        if (projectAccessKey) {
            builderProjectId = extractProjectIdFromAccessKey(projectAccessKey);
            if (!builderProjectId) {
                console.log("Invalid Project Access Key provided. Please provide a valid Project Access Key.");
                process.exit();
            }
        }
    }

    cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

    shell.exec(`git clone ${EMBEDDED_WALLET_VERIFY_SESSION_REPO_URL} ${REPOSITORY_FILENAME}`, { silent: !options.verbose });
    
    const directoryExists = checkIfDirectoryExists(REPOSITORY_FILENAME);
    if (!directoryExists) {
        cliConsole.error("Repository cloning failed. Please try again.");
        return;
    }

    shell.cd(REPOSITORY_FILENAME);
    shell.exec(`touch client/.env`, { silent: !options.verbose });
    shell.exec(`touch server/.env`, { silent: !options.verbose });

    cliConsole.loading("Configuring your project");

    const envClientExampleContent = shell.cat('./client/.env.example').toString();
    const envClientExampleLines = envClientExampleContent.split('\n');

    const envKeysForFrontend: EnvKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
    };

    writeToEnvFile(envKeysForFrontend, { ...options, pathToWrite: "./client/.env" });
    writeDefaultKeysToEnvFileIfMissing(envClientExampleLines, envKeysForFrontend, { ...options, pathToWrite: "./client/.env" });

    const envKeysForBackend: EnvKeys = {
        "BUILDER_PROJECT_ID": builderProjectId?.toString() || undefined,
    };

    const envServerExampleContent = shell.cat('./server/.env.example').toString();
    const envServerExampleLines = envServerExampleContent.split('\n');

    writeToEnvFile(envKeysForBackend, { ...options, pathToWrite: "./server/.env" });
    writeDefaultKeysToEnvFileIfMissing(envServerExampleLines, envKeysForBackend, { ...options, pathToWrite: "./server/.env" });

    cliConsole.loading("Installing dependencies");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);
    cliConsole.loading("Starting development server");

    shell.exec(`pnpm start`, { silent: false });
}
