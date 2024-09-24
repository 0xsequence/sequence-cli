export enum WalletTypes {
    EmbeddedWallet = "waas",
    UniversalWallet = "universal",
}

export type EnvWriteOptions = {
    verbose: boolean;
};
  
export type EnvKeys = {
    [key: string]: string | undefined;
};