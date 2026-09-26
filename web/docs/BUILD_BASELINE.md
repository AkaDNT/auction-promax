# Web Build Baseline

This repository is independently verified with Node.js 24.15.0 and npm 11.12.1.

```powershell
npm ci
npm run lint
npm run build
```

The exact Node version is in `.nvmrc`; `package.json` and `.npmrc` enforce the Node/npm policy. GitHub Actions runs the same commands in `.github/workflows/web-baseline.yml`.

No credentials are required for this baseline workflow.
