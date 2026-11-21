# CertifyFlow (React 19 migration)

A browser-based demonstration of a course certification workflow. This is a modern reconstruction inspired by a collaborative certificate generator developed by Alexander Shotayo and Ian at NCAIR in 2025. The recovered early Tkinter/Pillow project is **not** represented as the current web source, and the original shared code is not published without the contributors’ permission.

## What it does

- Imports a fictional/test CSV containing **Name, Email, Score** and optional **Course**.
- Validates records, supports an adjustable passing threshold (initially 50%), and displays outcomes.
- Generates downloadable PDF certificates and bulk ZIP exports for students who pass.
- Prepares notification drafts for passing and retake outcomes. **No real emails are sent.**
- Runs locally in the browser with no backend or database; user data remains in the current browser session.

## Requirements

- Node.js 22.12+ or 20.19+
- npm

## Run on your computer

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Use the fictional sample CSV in the app or `public/sample_students.csv`.

```bash
npm run typecheck
npm run build
npm test
```

The production build appears in `dist/` and can be deployed to a static hosting provider such as Cloudflare Pages (build command: `npm run build`, output directory: `dist`).

## Technical design

React 19 + TypeScript + Vite + custom CSS. The core CSV functions are kept separate from the interface; certificate and ZIP creation happen in-browser. There is no authentication or server-side processing.

The `npm run test:core` task runs behavior tests against the actual CSV processing and pass/fail logic.

## Safety and provenance

**Use sample or fictional data only.** Do not upload real student or institutional records to a publicly shared demo. The app produces demonstration certificates, not official credentials. The `send emails` control remains disabled.

This project is a **2026 reconstruction and enhancement** of the original NCAIR (Abuja) internship certificate automation project co-developed by Alexander Shotayo and Ian. Modern source was developed using AI coding assistance. The recovered original Python script is not redistributed here.

## Migration status

- React 16 UMD globals have been replaced with React 19 package imports and `createRoot`.
- The application is organized as TypeScript modules with a standard Vite build.
- New dependencies are declared in package.json.
- **Dependency installation and browser testing of the React 19 version are still required** before switching the primary GitHub app to this migration. The build environment used to create the migration could not reach the npm registry.

For the previously tested offline build, use the legacy single-file demo in the repository main branch.
