# Sequence CLI

Sequence CLI is a collection of commands to help developers bootstrap, integrate, and operate with Sequence services from the terminal. It focuses on fast starts, sensible prompts, and running everything via `npx`.

## Quick start

Run any command directly with `npx`:

```bash
npx sequence-cli --help
```

See help for a specific group or command:

```bash
npx sequence-cli marketplace --help
npx sequence-cli marketplace create-listings --help
```

Most commands are interactive and will prompt for any missing options.

## Command groups and common tasks

### Wallet
- **create-single-signer**: Create a single-signer Sequence wallet for any EOA and print its address.
  - Example:
    ```bash
    npx sequence-cli wallet create-single-signer
    ```
- **identify-sequence-wallet**: Identify the Sequence wallet address from a given transaction hash.
  - Example:
    ```bash
    npx sequence-cli wallet identify-sequence-wallet
    ```
    Use `--help` for available flags; otherwise you’ll be prompted.

### Boilerplates
Clone ready-to-run starter projects that integrate Sequence SDKs and features:

- **create-embedded-wallet-react-starter**
- **create-embedded-wallet-nextjs-starter**
- **create-embedded-wallet-epic-nextjs-starter** (includes Epic Games login support)
- **create-google-embedded-wallet-react-starter**
- **create-email-embedded-wallet-react-starter**
- **create-stytch-embedded-wallet-react-starter**
- **create-server-side-transactions**
- **create-embedded-wallet-linking-starter**
- **create-embedded-wallet-verify-session-starter**
- **create-universal-wallet-starter**
- **create-primary-drop-sales-erc721-starter**
- **create-primary-sales-erc1155-starter**
- **create-telegram-embedded-wallet-react-starter**
- **create-sequence-pay-starter**
- **create-crypto-onramp-starter**
- **create-trails-starter**
- **create-trails-nextjs-starter**

Example usage:

```bash
npx sequence-cli boilerplates create-embedded-wallet-react-starter my-app
```

Tip: Run `npx sequence-cli boilerplates --help` to list all boilerplates and options.

### Marketplace
- **create-listings**: Create listings for minted tokens in your wallet.
  - Example:
    ```bash
    npx sequence-cli marketplace create-listings
    ```
    You’ll be prompted for required details (network, collection, pricing, etc.).
- **create-marketplace-boilerplate**: Clone a Marketplace + Next.js starter.
  - Example:
    ```bash
    npx sequence-cli marketplace create-marketplace-boilerplate my-marketplace
    ```

## Usage patterns

- **Interactive first**: Most commands prompt for missing inputs.
- **Idempotent**: Boilerplate generators won’t overwrite existing folders unless you choose so.
- **npx-friendly**: Prefer invoking via `npx` so you always get the latest released version:
  ```bash
  npx sequence-cli@latest <group> <command> [options]
  ```

## Requirements

- Node.js 18+ (recommended)
- Git installed (for cloning boilerplates)

## New version release flow

This project is intended to be consumed via `npx`. To release a new version:

1) Ensure your changes are merged to `main` and working locally.
2) Bump the package version:
   ```bash
   npm version patch   # or: minor | major
   ```
3) Build artifacts:
   ```bash
   pnpm build
   ```
4) Publish to npm:
   ```bash
   npm publish --access public
   ```
5) Push commits and tags:
   ```bash
   git push origin main --follow-tags
   ```
6) Sanity check the release:
   ```bash
   npx sequence-cli@<new-version> --help
   ```

Notes:
- Keep releases backwards-compatible whenever possible.
- Prefer small, frequent releases. Document breaking changes clearly.

## Local development (optional)

```bash
pnpm install
pnpm dev     # run the CLI from source (TypeScript, watches for changes)
pnpm build   # produce ./dist and make the binary executable
```

## License

MIT — see the [LICENSE](./LICENSE) file for details.
