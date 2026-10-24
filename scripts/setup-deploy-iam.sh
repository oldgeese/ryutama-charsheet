#!/usr/bin/env bash
# GitHub Actions が Workload Identity Federation でデプロイできるようにする。
# プロジェクトごとに 1 回だけ実行する。何度実行しても結果は変わらない。
#   使い方: scripts/setup-deploy-iam.sh <プロジェクト ID> <GitHub の Environment 名>
#   例:     scripts/setup-deploy-iam.sh ryutama-charsheet-dev dev
set -euo pipefail

project=$1
environment=$2
repository=oldgeese/ryutama-charsheet
account=github-deploy@$project.iam.gserviceaccount.com
number=$(gcloud projects describe "$project" --format='value(projectNumber)')
pool=projects/$number/locations/global/workloadIdentityPools/github

gcloud iam workload-identity-pools describe github --project="$project" --location=global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create github --project="$project" --location=global \
    --display-name='GitHub Actions'

# このリポジトリの、指定した Environment のジョブからだけ入れる
gcloud iam workload-identity-pools providers describe github --project="$project" --location=global \
  --workload-identity-pool=github >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc github --project="$project" --location=global \
    --workload-identity-pool=github \
    --issuer-uri=https://token.actions.githubusercontent.com \
    --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.environment=assertion.environment' \
    --attribute-condition="assertion.repository=='$repository' && assertion.environment=='$environment'"

gcloud iam service-accounts describe "$account" --project="$project" >/dev/null 2>&1 ||
  gcloud iam service-accounts create github-deploy --project="$project" --display-name='GitHub Actions deploy'

# firebase deploy（Hosting、Firestore のルールとインデックス、Functions 第 2 世代）に要るロール
for role in \
  roles/firebase.admin \
  roles/cloudfunctions.admin \
  roles/run.admin \
  roles/artifactregistry.admin \
  roles/iam.serviceAccountUser \
  roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$project" --member="serviceAccount:$account" --role="$role" \
    --condition=None --quiet >/dev/null
done

gcloud iam service-accounts add-iam-policy-binding "$account" --project="$project" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/$pool/attribute.repository/$repository" --quiet >/dev/null

echo "WORKLOAD_IDENTITY_PROVIDER=$pool/providers/github"
echo "SERVICE_ACCOUNT=$account"
