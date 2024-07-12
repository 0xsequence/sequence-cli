import { Command } from "commander";
import { input } from "@inquirer/prompts";

import shell from "shelljs";


const EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence/embedded-wallet-react-boilerplate/";


async function createEmbeddedWalletReact(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;

    if (!waasConfigKey) {
        console.log("Please provide the WaaS Config Key for your project.");
        console.log("Your config key can be found at https://sequence.build under the embedded wallet settings.");
        console.log("To skip and use the default test config key, press enter.");
 
        waasConfigKey = await input({
            message: "WaaS Config Key:",
        });

        console.log("");
    }

    if (!projectAccessKey) {
        console.log("Please provide the Project Access Key for your project.");
        console.log("Your access key can be found at https://sequence.build under the project settings.");
        console.log("To skip and use the default test access key, press enter.");
 
        projectAccessKey = await input({
            message: "Project Access Key:",
        });

        console.log("");
    }

    console.log("Cloning the repo to `embedded-wallet-react-boilerplate`...");

    shell.exec(`git clone ${EMBEDDED_WALLET_REACT_REPO_URL} embedded-wallet-react-boilerplate`, { silent: !options.verbose });
    
    shell.cd("embedded-wallet-react-boilerplate");

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    for (let i = 0; i < envExampleLines.length; i++) {
        if (envExampleLines[i].includes('VITE_WAAS_CONFIG_KEY') && waasConfigKey != '') {
            shell.exec(`echo VITE_WAAS_CONFIG_KEY=${waasConfigKey} >> .env`, { silent: !options.verbose });
        } else if (envExampleLines[i].includes('VITE_PROJECT_ACCESS_KEY') && projectAccessKey != '') {
            shell.exec(`echo VITE_PROJECT_ACCESS_KEY=${projectAccessKey} >> .env`, { silent: !options.verbose });
        } else {
            shell.exec(`echo ${envExampleLines[i]} >> .env`, { silent: !options.verbose });
        }
    }

    console.log("Embedded Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm dev`, { silent: false });
}

export function makeCommandBoilerplates(program: Command) {
    const comm = new Command("boilerplates");

    comm.action(() => {
        comm.help();
    });

    comm
        .command("create-embedded-wallet-react-starter")
        .description("Clone a starter boilerplate for Sequence Embedded Wallet integrated with React")
        .option(
        "--waas-config-key <waas_key>",
        "WaaS config key for this project"
        )
        .option(
        "--project-access-key <access_key>",
        "Project access key for Sequence requests"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createEmbeddedWalletReact(program, options);
        });

    return comm;
}
