# Hash Generator

Cryptographic hash generator using the Web Crypto API. Supports SHA-1, SHA-256, SHA-384, and SHA-512 for both text and files. Everything runs client-side — no data is sent to any server.

**[Live Demo](https://gmowses.github.io/hash-generator)**

## Features

- **Web Crypto API** -- uses `crypto.subtle.digest()` for browser-native cryptographic hashing
- **Multiple algorithms** -- SHA-1, SHA-256, SHA-384, SHA-512 computed simultaneously
- **Text hashing** -- auto-hashes as you type (debounced 300ms)
- **File hashing** -- drag and drop or click to select any file
- **Compare mode** -- paste a hash to verify it against all generated hashes
- **Input stats** -- character count, byte size, encoding detection, MIME type for files
- **Copy to clipboard** -- per-algorithm copy buttons with visual feedback
- **Dark / Light mode** -- toggle or auto-detect from system preference
- **i18n** -- English and Portuguese (auto-detect from browser language)
- **Zero backend** -- pure client-side, works offline after first load

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS v4
- Vite
- Lucide icons

## Getting Started

```bash
git clone https://github.com/gmowses/hash-generator.git
cd hash-generator
npm install
npm run dev
```

Open `http://localhost:5173/hash-generator/` in your browser.

## Build

```bash
npm run build
```

Static files are generated in `dist/`.

## How It Works

All hashing is performed by the browser's built-in `crypto.subtle.digest()` API. No JavaScript hash libraries are shipped. The output is a lowercase hexadecimal string.

### Algorithms

| Algorithm | Output size | Notes |
|-----------|-------------|-------|
| SHA-1     | 160 bits / 40 hex chars | Legacy; avoid for security-critical use |
| SHA-256   | 256 bits / 64 hex chars | Widely used general-purpose hash |
| SHA-384   | 384 bits / 96 hex chars | Part of SHA-2 family |
| SHA-512   | 512 bits / 128 hex chars | Maximum SHA-2 strength |

### Compare Mode

Paste any hash into the compare field. The app normalises it to lowercase and checks it against every generated hash. A match indicates both the algorithm and that the input has not been tampered with.

## License

[MIT](LICENSE) -- Gabriel Mowses
