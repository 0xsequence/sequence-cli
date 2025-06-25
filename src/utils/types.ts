export enum WalletTypes {
  EmbeddedWallet = 'waas',
  UniversalWallet = 'universal',
}

export type EnvWriteOptions = {
  verbose?: boolean;
  pathToWrite?: string;
};

export type PromptForKeysWithLogsOptions = {
  allowEmptyInput: boolean;
};

export type EnvKeys = {
  [key: string]: string | number | undefined;
};

export type KeyPromptParams = {
  key: string | undefined;
  inputMessage: string;
};
