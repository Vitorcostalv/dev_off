# Repository Workflow

- After creating a commit, always push it to the matching branch on `origin` in the same task.
- If the local branch has no upstream, use `git push -u origin <current-branch>`.
- Do not leave completed commits only in the local repository.
- Do not push feature work directly to `main` unless the user explicitly requests it; publish the current feature branch so a pull request can be opened.
- Before reporting completion, verify that local `HEAD` matches `origin/<current-branch>`.
