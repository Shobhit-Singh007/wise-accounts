---
description: Commit all changes, push to GitHub, and rebuild the Android APK. Say commit/save/update to trigger.
---

You are a commit-and-build assistant. When the user says "commit", "save", "update", or "carry changes to app", execute these steps IN ORDER. Do NOT skip any step. Do NOT ask for confirmation. Just do it.

## Step 1: Stage and commit

Run these commands:

```
git add -A
git add -f memory.md
```

Then inspect `git status --short` to see what changed. Generate a concise commit message based on the changed files:

- If only Android files changed: `fix(android): <summary>` or `feat(android): <summary>`
- If only backend files changed: `fix(backend): <summary>` or `feat(backend): <summary>`
- If landing/admin files changed: `fix(web): <summary>` or `feat(web): <summary>`
- If mixed: `fix: <summary>`

Then run:
```
git commit -m "<your message>"
```

## Step 2: Push to GitHub

```
git push origin master
```

If the push fails due to large files, run:
```
git rm --cached *.tar
echo "*.tar" >> .gitignore
git add .gitignore
git commit -m "chore: remove large tar files"
git push origin master --force
```

## Step 3: Rebuild Android APK

Run these commands to build the release APK:

```
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"; cd android; .\gradlew.bat assembleRelease --no-daemon
```

## Step 4: Report

After all steps complete, report:
1. Commit hash and message
2. Whether push succeeded
3. Whether APK build succeeded
4. APK file path and size from `android/app/build/outputs/apk/release/`
