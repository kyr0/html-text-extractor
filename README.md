<h1 align="center">html-text-extractor</h1>

An HTML parsing library for Node.js, designed to extract text sections associated with anchor tags and headings from HTML files in a directory and its subdirectories. The extracted text is structured for indexing in a full-text search engine. The library produces an array of sections, each with properties for the URL (based on the file path), the anchor (if present), the title (based on the following heading tag), and the text.

<h2 align="center">Features</h2>

- ✅ Extracts text from HTML files in a folder (and it's sub-folders)
- ✅ Available as a simple API
- ✅ Just `624 byte` nano sized (ESM, gizpped)
- ✅ Tree-shakable and side-effect free
- ✅ First class TypeScript support
- ✅ 100% Unit Test coverage

<h2 align="center">Example usage (API, as a library)</h2>

<h3 align="center">Setup</h3>

- yarn: `yarn add html-text-extractor`
- npm: `npm install html-text-extractor`

<h3 align="center">ESM</h3>

```ts
import { extract } from 'html-text-extractor'

const result = await extract('./dist')
```

<h3 align="center">CommonJS</h3>

```ts
const { extract } = require('html-text-extractor')

// same API like ESM variant
```
