# CertifyFlow

**A browser-based certificate automation prototype**

CertifyFlow reconstructs and extends a course certification application originally co-developed by Alexander Shotayo and Ian during their 2025 internship at the National Centre for Artificial Intelligence and Robotics (NCAIR), Abuja.

The recovered early Python prototype used Tkinter and Pillow to generate individual certificates and local retake notices. This new portfolio prototype adds CSV importing, a modern dashboard, bulk PDF generation, student result review, and email draft previews.

This is **not** a commercial product or a production credentialing system. It is an educational portfolio reconstruction developed with AI coding assistance.

## Try the application

1. Download or clone this repository.
2. Open [`index.html`](index.html) in a current browser such as Chrome or Edge. It is a self-contained offline demo.
3. Use **Import Students** and choose a CSV file.
4. Review results, change the passing threshold, download certificates, or preview draft notifications.

The included [sample_students.csv](sample_students.csv) contains fictional records.

**Expected CSV columns:** `Name,Email,Course,Score`. `Course` is optional if you provide a default in the import screen. The legacy `Name,MetricNumber,Score,Email` structure is also supported.

Only CSV files are supported, not Excel spreadsheets. If you have an `.xlsx` file, export it as CSV UTF-8 first. Invalid files produce a visible error message.

## Features in version 0.1.1

- Responsive dashboard, navigation, and course statistics
- CSV upload and drag-and-drop file import
- Record validation: missing fields, malformed addresses, scores outside 0 to 100, and duplicates
- Configurable passing threshold, default 50%, matching the original prototype
- Student search, outcome filters, and CSV results export
- Individual PDF certificate generation
- Bulk ZIP export of certificates for up to 150 successful students
- Personalized passing and retake email drafts, without real delivery
- Local processing only: no backend or student record uploads

**Email sending is disabled.** No real messages are sent, and neither uploaded student information nor generated drafts are transmitted to a server. Work is not retained after a browser refresh. Use only fictional or otherwise authorized student records.

## Project files

- [`index.html`](index.html): completely self-contained offline demo, including the interface and browser dependencies
- [`web/index.html`](web/index.html): equivalent multi-file web entry point
- [`web/style.css`](web/style.css): UI styles
- [`web/dist/app.js`](web/dist/app.js): bundled application code, including CSV parsing, workflow logic, PDF generation, and interface
- [`web/vendor/`](web/vendor): pinned React and ReactDOM browser assets for the current prototype
- [`tests/test-core.mjs`](tests/test-core.mjs): Node.js tests of the shipped CSV and rules engine
- [`sample_students.csv`](sample_students.csv): fictional test records
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md): bundled library licenses

The browser application's **compiled JavaScript and CSS** are in this repository. The original TypeScript development workspace from the local project package has not yet been committed in this first GitHub version. The private recovered 2025 Python source is also intentionally excluded pending collaborator review and permission.

## Run tests

With Node.js 18 or newer installed, run:

```bash
npm test
```

The suite checks CSV quoted fields, basic imports, invalid records, pass/fail messages, and formula-safe CSV export.

## Technical notes

This prototype uses React with custom CSS and client-side PDF generation. For offline compatibility, the current version bundles **React 16.0.0** and **ReactDOM 16.0.1**. Those versions are obsolete. **Upgrade to a supported React release and a maintained build toolchain before deploying publicly.**

The browser app is suitable as a local portfolio demo, not as a secure public certification service. Any future real email integration would require a backend, authenticated operators, authorization, verified sending domain, audit logs, and privacy safeguards.

## Credits

The original NCAIR certificate automation project was collaboratively developed by Alexander Shotayo and Ian in 2025. This repository contains a **2026 reconstruction and enhancement** informed by the original workflow, with AI-assisted implementation.

No real student data or unlicensed third-party certificate artwork is intentionally included.

**Current status:** Functional private portfolio prototype. Not publicly hosted or connected to an email sender.
