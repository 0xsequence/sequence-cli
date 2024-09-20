
import { input } from "@inquirer/prompts";
import { Command } from "commander";
import { extractProjectIdFromAccessKey } from "@0xsequence/utils";
import { promptUserKeyCustomizationDecision } from "../utils";

import shell from "shelljs";


const EMBEDDED_WALLET_VERIFY_SESSION_REPO_URL = "https://github.com/0xsequence-demos/embedded-wallet-verify-session";


export async function createEmbeddedWalletVerifySession(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let builderProjectId;

    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();

    if (userWantsToConfigureTheirKeys) {
        if (!waasConfigKey) {
            console.log("Please provide the WaaS Config Key for your project.");
            console.log("Your config key can be found at https://sequence.build under the embedded wallet settings.");
            console.log("To skip and use the default test config key, press enter.");
     
            waasConfigKey = await input({
                message: "WaaS Config Key:",
            });
    
            console.log("");
        }
    
        if (!projectAccessKey && waasConfigKey != '') {
            console.log("Please provide the Project Access Key for your project.");
            console.log("Your access key can be found at https://sequence.build under the project settings.");
            console.log("To skip and use the default test access key, press enter.");
     
            projectAccessKey = await input({
                message: "Project Access Key:",
            });
    
            console.log("");
        }
    
        if (!googleClientId && waasConfigKey != '') {
            console.log("Please provide the Google Client ID for your project.");
            console.log("Your client ID can be found at https://console.cloud.google.com/apis/credentials");
            console.log("To skip and use the default test client ID, press enter.");
     
            googleClientId = await input({
                message: "Google Client ID:",
            });
    
            console.log("");
        }
        
        if (projectAccessKey) {
            builderProjectId = extractProjectIdFromAccessKey(projectAccessKey);
            if (!builderProjectId) {
                console.log("Invalid Project Access Key provided. Please provide a valid Project Access Key.");
                process.exit();
            }
        }
    }

    console.log("Cloning the repo to `embedded-wallet-verify-session-boilerplate`...");

    shell.exec(`git clone ${EMBEDDED_WALLET_VERIFY_SESSION_REPO_URL} embedded-wallet-verify-session-boilerplate`, { silent: !options.verbose });
    
    shell.cd("embedded-wallet-verify-session-boilerplate");
    shell.exec(`touch client/.env`, { silent: !options.verbose });
    shell.exec(`touch server/.env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envClientExampleContent = shell.cat('./client/.env.example').toString();
    const envClientExampleLines = envClientExampleContent.split('\n');

    for (let i = 0; i < envClientExampleLines.length; i++) {
        if (envClientExampleLines[i].trim() == "") continue;
        if (envClientExampleLines[i].includes('VITE_WAAS_CONFIG_KEY') && waasConfigKey != '' && projectAccessKey != undefined) {
            shell.exec(`echo VITE_WAAS_CONFIG_KEY=${waasConfigKey} >> ./client/.env`, { silent: !options.verbose });
        } else if (envClientExampleLines[i].includes('VITE_PROJECT_ACCESS_KEY') && projectAccessKey != '' && projectAccessKey != undefined) {
            shell.exec(`echo VITE_PROJECT_ACCESS_KEY=${projectAccessKey} >> ./client/.env`, { silent: !options.verbose });
        } else if (envClientExampleLines[i].includes('VITE_GOOGLE_CLIENT_ID') && googleClientId != '' && googleClientId != undefined) {
            shell.exec(`echo VITE_GOOGLE_CLIENT_ID=${googleClientId} >> ./client/.env`, { silent: !options.verbose });
        } else {
            shell.exec(`echo ${envClientExampleLines[i]} >> ./client/.env`, { silent: !options.verbose });
        }
    }

    const envServerExampleContent = shell.cat('./server/.env.example').toString();
    const envServerExampleLines = envServerExampleContent.split('\n');

    for (let i = 0; i < envServerExampleLines.length; i++) {
        if (envServerExampleLines[i].includes('BUILDER_PROJECT_ID') && waasConfigKey != '') {
            shell.exec(`echo BUILDER_PROJECT_ID=${builderProjectId} >> ./server/.env`, { silent: !options.verbose });
        } else {
            shell.exec(`echo ${envServerExampleLines[i]} >> ./server/.env`, { silent: !options.verbose });
        }
    }

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Embedded Wallet Verify Session boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm start`, { silent: false });
}
