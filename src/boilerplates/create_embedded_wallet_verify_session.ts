
import { input } from "@inquirer/prompts";
import { Command } from "commander";

import shell from "shelljs";


const EMBEDDED_WALLET_VERIFY_SESSION_REPO_URL = "https://github.com/0xsequence-demos/embedded-wallet-verify-session";


export async function createEmbeddedWalletVerifySession(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let builderApiId = options.builderApiId;

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

    if (!builderApiId && waasConfigKey != '') {
        console.log("Please provide your project id for your project.");
        console.log("Your project id can be found at https://sequence.build/");
        console.log("Please select a project and copy your project id from URL. It will look like: 2317");        
        console.log("To skip and use the default test client ID, press enter.");
        const baseBuilderApiIdUrl = "https://api.sequence.build/project/";
        builderApiId = await input({
            message: "Builder API ID:",
        });

        if (builderApiId) {
            builderApiId = baseBuilderApiIdUrl + builderApiId;
        }

        console.log("");
    }

    console.log("Cloning the repo to `embedded-wallet-verify_session_boilerplate`...");

    shell.exec(`git clone ${EMBEDDED_WALLET_VERIFY_SESSION_REPO_URL} embedded-wallet-verify_session_boilerplate`, { silent: !options.verbose });
    
    shell.cd("embedded-wallet-verify_session_boilerplate");
    shell.exec(`touch client/.env`, { silent: !options.verbose });
    shell.exec(`touch server/.env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envClientExampleContent = shell.cat('./client/.env.example').toString();
    const envClientExampleLines = envClientExampleContent.split('\n');

    for (let i = 0; i < envClientExampleLines.length; i++) {
        if (envClientExampleLines[i].trim() == "") continue;
        if (envClientExampleLines[i].includes('VITE_WAAS_CONFIG_KEY') && waasConfigKey != '') {
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
        if (envServerExampleLines[i].includes('BUILDER_API_ID') && waasConfigKey != '') {
            shell.exec(`echo BUILDER_API_ID=${builderApiId} >> ./server/.env`, { silent: !options.verbose });
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