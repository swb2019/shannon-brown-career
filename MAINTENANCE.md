# Maintenance and release checks

The portfolio is a static public site. The private product strategy, source résumé, evidence registry, and approval records do not belong in this repository.

## Content

Edit published notes in `scripts/content.mjs` and shared templates in `scripts/build.mjs`. Keep public sources, assumptions, alternatives, dates, and change indicators together. The build excludes note records whose visibility is not `public`; never place private material in the repository, even as a draft. Verify role dates and credential wording against current owner-provided information before a major biography change.

## Verification

`npm ci`, `npm run build`, and `npm run check` reproduce the pages and validate routes, local links, image attributes, source schema, and size budgets. The `Portfolio quality` workflow adds Chromium, Firefox, WebKit, and 390-pixel mobile journeys, axe accessibility checks, an off-thread WebGL enhancement check, static fallback checks, and five Lighthouse cold runs for each of eight routes on both mobile and desktop (80 runs). Saved artifacts record the tested environment and revision. Software rendering and device emulation are not real-device certification. Screen-reader and qualitative reader review remain human checks.

## Release

Inspect the latest remote head before making changes. Use a branch, keep changes reviewable, pass the required checks, and publish only generated files matching the reviewed source. Preserve the existing project base path and résumé URL. Check the deployed home, one nested note, case study, contact link, and a direct refresh after publication.

## Rollback

The pre-redesign public baseline is `2b8c5c534639d72745c483d522d122cf529fe73d`. Revert the release commit through a normal reviewed commit or redeploy the previous known-good Pages artifact. Do not force-push main. A rollback rehearsal can build the baseline in a separate checkout and verify its entrypoint and résumé; it must not replace the live site merely to test a rollback.

## Cadence

- Monthly: review links, dependencies, privacy wording, and build status.
- Before major changes: verify claims, run the workflow, check keyboard navigation and reduced motion, and inspect mobile and desktop layouts.
- Quarterly: revisit the two briefs for source changes and the Hourglass case study for implementation drift. Record the actual review date only after review.
- As evidence permits: conduct a small practitioner/executive reader review and incorporate specific findings. Do not publish invented reader results, endorsements, or field-performance metrics.

Analytics are off. No maintenance automation or outreach is installed by this repository.
