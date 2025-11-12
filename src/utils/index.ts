import { Wallet } from 'ethers';
import { select, input } from '@inquirer/prompts';
import {
  EnvKeys,
  EnvWriteOptions,
  KeyPromptParams,
  PromptForKeysWithLogsOptions,
} from './types';
import shell from 'shelljs';
import chalk from 'chalk';

export function isValidPrivateKey(privateKey: string) {
  try {
    new Wallet(privateKey);
    return true;
  } catch (error) {
    return false;
  }
}

export const cliConsole = {
  error: (message: string) => {
    console.log(chalk.red(message));
  },
  errorFieldInBlank: () => {
    cliConsole.error('You cannot leave this field in blank. Please try again.');
  },
  warning: (message: string) => {
    console.log(chalk.yellow(`⚠️  ${message}`));
  },
  info: (message: string) => {
    console.log(chalk.blue(`ℹ️ ${message}`));
  },
  success: (message: string) => {
    console.log(chalk.green(`✅  ${message}`));
  },
  loading: (message: string) => {
    console.log(chalk.gray(`⏳ ${message}...`));
  },
  done: (message: string) => {
    console.log(chalk.greenBright(`🎉 ${message}`));
  },
  lineBreak: () => {
    console.log('\n');
  },
  sectionTitle: (title: string) => {
    console.log(chalk.magenta.bold(`\n=== ${title.toUpperCase()} ===\n`));
  },
};

export async function promptUserKeyCustomizationDecision(): Promise<boolean> {
  return await select({
    message:
      'Would you like to use the default configuration keys for testing?',
    choices: [
      {
        name: 'Use test keys',
        value: false,
      },
      {
        name: "I'll provide my own keys",
        value: true,
      },
    ],
  });
}

export async function promptForKeyWithLogs(
  prompt: KeyPromptParams,
  logs: string[]
): Promise<string | undefined> {
  if (!prompt.key) {
    logs.forEach(log => console.log(log));
    const inputKey = await input({
      message: prompt.inputMessage,
    });
    console.log('');
    return inputKey || prompt.key;
  }
  return prompt.key;
}

export async function executePromptWithRetry(
  promptFn: (
    params: KeyPromptParams,
    logs: string[]
  ) => Promise<string | undefined>,
  params: KeyPromptParams,
  logs: string[],
  options: PromptForKeysWithLogsOptions = { allowEmptyInput: true }
): Promise<string | undefined> {
  const promptResult = await promptFn(params, logs);

  if (!promptResult && !options.allowEmptyInput) {
    cliConsole.errorFieldInBlank();
    return await executePromptWithRetry(promptFn, params, logs, options);
  }

  return promptResult;
}

export async function promptForProjectAccessKeyWithLogs(
  projectAccessKey: string | undefined,
  options: PromptForKeysWithLogsOptions = { allowEmptyInput: true }
): Promise<string | undefined> {
  const logsArray = [
    'Please provide the Project Access Key for your project.',
    'Your access key can be found at https://sequence.build under the project settings.',
  ];

  if (options.allowEmptyInput) {
    logsArray.push('To skip and use the default test access key, press enter.');
  }

  return await executePromptWithRetry(
    promptForKeyWithLogs,
    { key: projectAccessKey, inputMessage: 'Project Access Key:' },
    logsArray,
    options
  );
}

export async function promptForWaaSConfigKeyWithLogs(
  waasConfigKey: string | undefined,
  options: PromptForKeysWithLogsOptions = { allowEmptyInput: true }
): Promise<string | undefined> {
  const logsArray = [
    'Please provide the WaaS Config Key for your project.',
    'Your config key can be found at https://sequence.build under the embedded wallet settings.',
  ];

  if (options.allowEmptyInput) {
    logsArray.push('To skip and use the default test config key, press enter.');
  }

  return await executePromptWithRetry(
    promptForKeyWithLogs,
    { key: waasConfigKey, inputMessage: 'WaaS Config Key:' },
    logsArray,
    options
  );
}

export async function promptForGoogleClientIdWithLogs(
  googleClientId: string | undefined,
  options: PromptForKeysWithLogsOptions = { allowEmptyInput: true }
): Promise<string | undefined> {
  const logsArray = [
    'Please provide the Google Client ID for your project.',
    'Your client ID can be found at https://console.cloud.google.com/apis/credentials.',
  ];

  if (options.allowEmptyInput) {
    logsArray.push('To skip and use the default test client ID, press enter.');
  }

  return await executePromptWithRetry(
    promptForKeyWithLogs,
    { key: googleClientId, inputMessage: 'Google Client ID:' },
    logsArray,
    options
  );
}

export async function promptForAppleClientIdWithLogs(
  appleClientId: string | undefined,
  options: PromptForKeysWithLogsOptions = { allowEmptyInput: true }
): Promise<string | undefined> {
  const logsArray = [
    'Please provide the Apple Client ID for your project.',
    'Your client ID can be found at https://developer.apple.com/account/resources/identifiers/list/serviceId',
  ];

  if (options.allowEmptyInput) {
    logsArray.push('To skip and use the default test client ID, press enter.');
  }

  return await executePromptWithRetry(
    promptForKeyWithLogs,
    { key: appleClientId, inputMessage: 'Apple Client ID:' },
    logsArray,
    options
  );
}

export async function promptForWalletConnectIdWithLogs(
  walletConnectId: string | undefined,
  options: PromptForKeysWithLogsOptions = { allowEmptyInput: true }
): Promise<string | undefined> {
  const logsArray = ['Please provide the Wallet Connect ID for your project.'];

  if (options.allowEmptyInput) {
    logsArray.push('To skip and use the default test client ID, press enter.');
  }

  return await executePromptWithRetry(
    promptForKeyWithLogs,
    { key: walletConnectId, inputMessage: 'Wallet Connect ID:' },
    logsArray,
    options
  );
}

export async function promptForJwtAccessKeyWithLogs(
  jwtAccessKey: string | undefined,
  options: PromptForKeysWithLogsOptions = { allowEmptyInput: true }
): Promise<string | undefined> {
  const logsArray = [
    'To get your jwt access key follow the first step in https://docs.sequence.xyz/guides/metadata-guide/',
  ];

  if (options.allowEmptyInput) {
    logsArray.push('To skip and use the default jwt access key, press enter.');
  }

  return await executePromptWithRetry(
    promptForKeyWithLogs,
    { key: jwtAccessKey, inputMessage: 'JWT Access Key:' },
    logsArray,
    options
  );
}

export async function promptForStytchWithLogs(
  stytchPublicToken: string | undefined
): Promise<string | undefined> {
  return await promptForKeyWithLogs(
    { key: stytchPublicToken, inputMessage: 'Stytch Public token:' },
    [
      'Please provide the Stytch Public token for your project found in your dashboard.',
      'Your Public token can be found at https://stytch.com/dashboard in the top header.',
      'To skip and use the default test Public token, press enter.',
    ]
  );
}

export async function promptForChainsWithLogs(
  chains: string | undefined,
  options: PromptForKeysWithLogsOptions = { allowEmptyInput: true }
): Promise<string | undefined> {
  const logsArray = [
    'Please provide chain names for your project.',
    'A supported network list is available at:',
    'https://github.com/0xsequence/sequence.js/tree/master/packages/network/networkNames.md',
  ];

  if (options.allowEmptyInput) {
    logsArray.push('To skip and use the default test chain ID, press enter.');
  }

  return await executePromptWithRetry(
    promptForKeyWithLogs,
    { key: chains, inputMessage: 'Chain names:' },
    logsArray,
    options
  );
}

export async function promptForTrailsApiKeyWithLogs(
  trailsApiKey: string | undefined,
  options: PromptForKeysWithLogsOptions = { allowEmptyInput: true }
): Promise<string | undefined> {
  const logsArray = [
    'Please provide your Trails API key for your project.',
    'Request an access key at https://t.me/build_with_trails',
  ];

  if (options.allowEmptyInput) {
    logsArray.push('Press Enter to skip.');
  }

  return await executePromptWithRetry(
    promptForKeyWithLogs,
    { key: trailsApiKey, inputMessage: 'Trails API key:' },
    logsArray,
    options
  );
}

export function writeToEnvFile(envKeys: EnvKeys, options: EnvWriteOptions) {
  Object.entries(envKeys).forEach(([key, value]) => {
    if (value && value !== '') {
      shell.exec(
        `echo ${key}=${value} >> ${
          options.pathToWrite ? options.pathToWrite : '.env'
        }`,
        { silent: !options.verbose }
      );
    }
  });
}

export function writeDefaultKeysToEnvFileIfMissing(
  envExampleLines: string[],
  envKeys: EnvKeys,
  options: EnvWriteOptions
) {
  const missingKeys = Object.entries(envKeys)
    .filter(([_, value]) => value === undefined || value === '')
    .map(([key, _]) => key);

  const envFilePath = options.pathToWrite ? options.pathToWrite : '.env';
  const envFileContent = shell.cat(envFilePath).toString();

  envExampleLines.forEach(line => {
    if (missingKeys.some(key => line.includes(key))) {
      if (!envFileContent.includes(line)) {
        shell.exec(`echo ${line} >> ${envFilePath}`, {
          silent: !options.verbose,
        });
      }
    }
  });
}

export function writeToWranglerEnvFile(
  envKeys: EnvKeys,
  options: EnvWriteOptions
) {
  Object.entries(envKeys).forEach(([key, value]) => {
    if (value && value !== '') {
      const formattedValue = typeof value === 'string' ? `"${value}"` : value;
      shell.exec(
        `echo ${key} = ${formattedValue} >> ${
          options.pathToWrite ? options.pathToWrite : 'wrangler.toml'
        }`,
        { silent: !options.verbose }
      );
    }
  });
}

export function appendToWranglerConfig(
  section: string,
  wranglerConfigPath: string,
  verbose: boolean
): void {
  const command = `echo ${section} >> ${wranglerConfigPath}`;
  shell.exec(command, { silent: !verbose });
}

export function addVarsToWranglerConfig(
  wranglerConfigPath: string,
  verbose: boolean
): void {
  appendToWranglerConfig('[vars]', wranglerConfigPath, verbose);
}

export function addDevToWranglerConfig(
  wranglerConfigPath: string,
  verbose: boolean
): void {
  appendToWranglerConfig('[dev]', wranglerConfigPath, verbose);
}

export function checkIfDirectoryExists(path: string): boolean {
  return shell.test('-d', path);
}
