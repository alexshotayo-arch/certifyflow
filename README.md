# CertifyFlow, version 0.1.1

**A working, browser-only portfolio prototype.** This is a modern reconstruction of the course certification automation project originally developed in 2025 at the National Centre for Artificial Intelligence and Robotics (NCAIR), Abuja, by the project's contributors, including Alexander Shotayo and Ian, another intern.

The recovered early Python GUI prototype used **Tkinter**, **Pillow**, a fixed 50% passing mark, and manual form entry to produce certificate images or local retake notices. This new web implementation expands the design with CSV ingestion, bulk certificates, a multi-screen dashboard, student review, and local email drafts. It is a **new reconstruction**, not the untouched original 2025 source.

## Run the prototype in 10 seconds

1. Extract this ZIP file.
2. Open **`CertifyFlow_Standalone_Demo.html`** in Chrome, Edge, Firefox, or another current browser.
3. Click around. Sample fictional student data is already loaded.
4. Use **Import Students** to upload your own **fictional/test CSV**. You can download a sample CSV in the app.

The standalone demo bundles its UI libraries and works **offline**. Open the downloaded HTML directly in Chrome or Edge rather than inside a document preview window. It is not hosted anywhere and does not require an account, a server, or a credit card.

## Features you can test

- Modern dashboard and responsive layout based on an approved design concept
- Local CSV upload with drag and drop, an accessible native file selector, and persistent error messages
- Name, Email, and Score required; Course optional; legacy `MetricNumber` column safely ignored
- CSV validation: score range, missing fields, email format, duplicate email and course combinations, and row-level errors
- Editable passing threshold, initially **50%** to match the recovered prototype
- Student search and pass/retake filters
- Results export to CSV
- Personalized PDF certificate download for passing students
- Bulk export of passing students' certificates as a ZIP of PDFs
- Personalized pass and retake notification drafts with copy/export options
- Demo-only activity log; there is **no email sending**, network request, or server-side data storage

## CSV example

```csv
Name,Email,Course,Score
Avery Chen,avery.chen@example.com,Python Foundations,91
Morgan Taylor,morgan.taylor@example.com,Python Foundations,43
```

Excel workbooks (`.xlsx` and `.xls`) are not accepted directly in this version. Export the relevant worksheet as CSV UTF-8 before importing. If a file is rejected, the Import Students page displays a persistent explanation.

The original recovered CSV had the format `Name,MetricNumber,Score,Email`. This import format is also supported, with the chosen default course added to records without a Course column.

## Development and source files

- `index.html`, `style.css`, `dist/app.js`, `vendor/`: self-contained multi-file web version
- `CertifyFlow_Standalone_Demo.html`: single-file offline demo
- `src/core.ts`: CSV parsing, validation, sample data, message templates
- `src/pdf.ts`: client-side certificate PDF and ZIP generation
- `src/app.tsx`: React interface and app state
- `tsconfig.json`: TypeScript build configuration
- `tests/`: core tests and browser integration tests
- `preview.png`: dashboard screenshot

**Frontend:** React and TypeScript with custom, hand-tuned CSS. This zero-install prototype bundles locally available React 16 UMD assets for offline use. **It is not yet a production build.** Before public deployment, move to a currently supported React release with a conventional Vite build, update the build pipeline, and review dependencies. Tailwind can be introduced during that migration; the current UI's CSS is handcrafted.

If you have Node.js and TypeScript installed, run `npm install` and `npm run build` to rebuild `dist/app.js`. `npm test` runs the small core test suite after the build. The standalone HTML may be regenerated with `python tests/make_standalone.py`.

## Technical boundaries

- No genuine email delivery, accounts, databases, persistence, or role-based access control
- Neither student records nor email drafts are uploaded to any backend
- Uploaded data and activity history disappear when you refresh the browser tab
- PDF certificates contain on-screen student/course text and an issuance date; they are **sample certificates** and do not verify course completion independently
- Up to 5,000 CSV records per import (file limit 2 MB); bulk ZIP generation is limited to 150 PDFs for browser memory safety
- No third-party certificate templates or original student records are included in this prototype

Do not use this demonstration to send official academic results or certificates. Real email delivery will require a secure backend, identity/access controls, delivery logging, domain verification, clear consent, and protection of personal information.

## Credits and provenance

This application reconstructs and extends an internship project originally co-developed by **Alexander Shotayo and Ian** at **NCAIR, Abuja, in 2025**. The privately recovered Python script and associated archive were used solely as references for the original pass/fail and certificate logic; they are not bundled in this public-ready prototype. This prototype was developed with AI coding assistance and should be represented as such when describing its 2026 reconstruction.

Do not publicly publish the original recovered code, personal records, or certificate art without confirming collaborator permission and asset rights.

## Development status

- [x] Design approved
- [x] Working dashboard and navigation
- [x] CSV import, validation and threshold logic
- [x] Personalized PDF generation and bulk ZIP
- [x] Notification drafts with no delivery
- [x] Basic automated tests and manual browser workflow checks
- [ ] Upgrade to supported React version and modern build system
- [ ] Accessibility and browser compatibility review
- [ ] Real email service integration and production security review
- [ ] Deploy to free static hosting

**Version 0.1.1 fix:** Verified the upload button and native file input in a browser using both the sample CSV and the recovered original CSV format; verified persistent errors for Excel files and incorrect headers.

**Demo data is fictional. The project has not been deployed.**