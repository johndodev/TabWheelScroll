---
description: Tag a release (major/minor/bugfix) — auto-calculates version, triggers GitHub Actions workflow
argument-hint: <major|minor|bugfix>
---

Release the project. The argument must be one of: `major`, `minor`, or `bugfix`. Follow these steps exactly:

## 1. Validate the argument

- Accept only `major`, `minor`, or `bugfix` (case-insensitive). Reject anything else and stop.

## 2. Calculate the next version

- Run `git tag --sort=-v:refname` and take the latest tag (e.g. `v3.0.4`).
- Parse it as `vMAJOR.MINOR.PATCH`.
- Compute the next version according to the argument:
  - `major` → increment MAJOR, reset MINOR and PATCH to 0
  - `minor` → increment MINOR, reset PATCH to 0
  - `bugfix` → increment PATCH only
- **Present the proposed version to the user and wait for explicit confirmation before continuing.** Do not proceed until the user confirms.

## 3. Check CHANGELOG.md

- Read `CHANGELOG.md` and confirm there is an `## [Unreleased]` section with actual content beneath it. If the section is empty or missing, stop and ask the user to fill it in first.

## 4. Update CHANGELOG.md

- Replace `## [Unreleased]` with `## [VERSION] - DATE` where VERSION is the computed version (without the `v` prefix) and DATE is today's date in `YYYY-MM-DD` format (use the `currentDate` context provided in the system prompt).
- Do NOT add a new `## [Unreleased]` section — leave the file as-is after the replacement.
- The format must comply with [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 5. Commit and tag

- Stage only `CHANGELOG.md`: `git add CHANGELOG.md`
- Commit with message: `Release vVERSION`
- Create an annotated tag: `git tag -a vVERSION -m "Release vVERSION"`

## 6. Push

- Push the commit: `git push`
- Push the tag: `git push origin vVERSION`
- Confirm to the user that the tag has been pushed and that the GitHub Actions workflow will handle the rest (building the zips and creating the GitHub release).