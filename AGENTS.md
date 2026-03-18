# Repository Guidance

## Deployment

- Do not deploy shared environments from a local machine.
- Do not run local `gcloud`, `firebase`, or repo deploy scripts to release backend, frontend, infrastructure, or WPPConnect changes.
- Deploy only through GitHub Actions CI/CD workflows.
- For normal dev releases, merge or push the approved change to `main` and let `.github/workflows/deploy.yml` perform the deployment.
- If a manual deployment is needed, trigger the GitHub Actions `Deploy` workflow with `workflow_dispatch` instead of deploying locally.
