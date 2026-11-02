# eat.one1 Account Transfer Guide

This runbook explains how to move the eat.one1 project to a different owner or business account without losing source code, deployments, customer data, product images, orders, or payment access.

Use an eat.one1-controlled business email for the destination accounts. Do not send passwords, database passwords, private API keys, recovery codes, or `.env` files to the new owner. Add the new owner through each service's team/member controls instead.

## Services covered

| Service              | What it owns                                           | Preferred transfer method                                       |
| -------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| GitHub               | Source code and history                                | Transfer the repository to the new user or organization         |
| Vercel               | Website deployments and domains                        | Transfer the project to the destination Vercel team             |
| Supabase             | Database, authentication, storage and server functions | Transfer the project to the destination Supabase organization   |
| Razorpay             | Payments, settlements and merchant KYC                 | Change team access; contact Razorpay if the legal owner changes |
| Domain registrar/DNS | Public domain and DNS records                          | Transfer the domain or change the registrant and account access |

## Before starting

1. Schedule the transfer during a quiet sales period.
2. Create the destination business accounts and enable two-factor authentication.
3. Add at least two trusted business owners where the service supports teams.
4. Record the current GitHub repository, Vercel project, Supabase project, Razorpay account and domain registrar.
5. Export a current database backup and save it in encrypted business storage.
6. Download or verify a backup of product images and other uploaded files.
7. Save a list of environment-variable **names only**. Never put their values in this document or Git.
8. Take screenshots of DNS records, webhook URLs, deployment settings and service integrations.
9. Confirm that the destination account's plan supports the features and usage required by eat.one1.

## Recommended transfer order

Transfer in this order so the live site remains connected while ownership changes:

1. GitHub repository
2. Supabase project
3. Vercel project and domain
4. Razorpay access and merchant details
5. Domain registrar ownership, if it is separate from Vercel
6. Rotate secrets and complete the verification checklist

## 1. Transfer GitHub

Current repository: `mrAbhimanyuVishwakarma/Eatone1`

1. Add the destination owner or create an eat.one1 GitHub organization.
2. Open the repository on GitHub.
3. Go to **Settings → General → Danger Zone → Transfer ownership**.
4. Enter the destination username or organization and confirm the repository name.
5. Ask the destination owner to accept the transfer email if GitHub requests it.
6. On every development computer, update the remote URL:

   ```powershell
   git remote set-url origin https://github.com/DESTINATION/Eatone1.git
   git remote -v
   git fetch origin
   ```

7. Verify branches, tags, issues, pull requests, Actions, deploy keys, webhooks and repository secrets.
8. Confirm that Vercel still has access to the transferred repository. Reconnect the Git integration if necessary.

Do not delete or recreate a repository at the old GitHub address immediately; doing so can break GitHub's redirect to the transferred repository.

## 2. Transfer Supabase

1. Invite the destination account to the destination Supabase organization.
2. The current organization owner opens **Project Settings → General → Transfer project**.
3. Select the destination organization and review its plan and free-project allowance.
4. Remove or temporarily disconnect anything Supabase identifies as blocking the transfer, such as a GitHub integration, project-scoped role, or log drain.
5. Start the transfer and wait for the project to become healthy in the destination organization.
6. Verify that the project reference, API URL, database, Auth users, Storage buckets, policies, Edge Functions and Realtime configuration are intact.
7. If any URL or credential changed, update the corresponding Vercel environment variables.

A direct Supabase project transfer does not change the project's region. Moving to another region requires a database/storage migration instead of an organization transfer.

If a direct transfer is unavailable, create a new Supabase project, restore the PostgreSQL backup, copy Storage objects, recreate Auth/provider settings and policies, deploy functions, update environment variables, and test before changing production traffic.

## 3. Transfer Vercel

Current production project: `eatone1`

1. Add the destination account to an eat.one1 Vercel team, preferably as an Owner.
2. Open **Project → Settings → General → Transfer Project**.
3. Select the destination team and review the project name, domains, aliases and environment variables shown by Vercel.
4. Complete the transfer and wait for it to finish.
5. Reconnect integrations that do not transfer automatically. Pay particular attention to GitHub, Vercel Blob, monitoring, log drains and marketplace integrations.
6. Confirm that Production, Preview and Development environment variables exist in the correct scopes.
7. Trigger a new deployment from the `main` branch and verify the production URL.

Never copy secrets into `vercel.json`. Store them in Vercel's encrypted Environment Variables settings.

## 4. Transfer Razorpay access

Razorpay is connected to the merchant's legal entity, KYC documents and settlement bank account. Moving website code does not transfer that merchant identity.

1. Add the destination business owner as an authorized Razorpay team member.
2. Verify the registered business name, contact details, GST/PAN details, settlement account and KYC information.
3. If the legal entity or beneficial owner is changing, contact Razorpay Support before accepting live payments. Razorpay may require updated KYC or a new merchant account.
4. Create or rotate production API keys from the approved merchant account.
5. Put the new key ID and secret in Vercel Environment Variables; never commit them.
6. Recreate or verify the payment webhook and its signing secret.
7. Make a small controlled live payment and confirm payment capture, webhook processing, order creation, refund access and settlement reporting.

## 5. Transfer the domain

1. Add the destination owner to the registrar account or initiate a registrar/account transfer.
2. Confirm that the registrant email belongs to eat.one1 and that domain auto-renewal is enabled.
3. Preserve every DNS record during the move, especially Vercel records, email MX records, SPF, DKIM and DMARC.
4. If the domain is managed by Vercel, move it to the destination Vercel team and verify the root domain and `www` alias.
5. Do not cancel the old registrar or DNS service until the website and email work from multiple networks.

## 6. Rotate credentials

After the new owner confirms access, rotate all sensitive credentials:

- Supabase service-role/database credentials, when applicable
- Razorpay API keys and webhook secret
- Admin account passwords and recovery codes
- Email provider credentials
- Storage or Blob tokens
- GitHub deploy keys and personal access tokens
- Any monitoring, analytics or third-party integration tokens

Update Vercel first, deploy, and verify the application before revoking the old credential. This avoids unnecessary downtime.

## Final verification checklist

- [ ] GitHub clone, pull and push work from the destination account.
- [ ] A commit to `main` creates a successful Vercel production deployment.
- [ ] The production domain loads with valid HTTPS.
- [ ] Customer registration, login, logout and password reset work.
- [ ] Admin login works and unauthorized customers cannot access admin features.
- [ ] Admin can create, edit, publish, archive and delete a test product.
- [ ] Product images upload and display correctly.
- [ ] Products, stock and prices persist in Supabase.
- [ ] Wishlist, cart and order history work.
- [ ] A controlled Razorpay payment succeeds and its webhook updates the order.
- [ ] A test refund can be initiated by the authorized owner.
- [ ] Transactional email and support email work.
- [ ] Database and file backups are accessible to the new business owner.
- [ ] Monitoring/status indicators show every production service as healthy.
- [ ] Old personal access is removed only after all checks pass.

## Emergency rollback

If a transfer causes an outage:

1. Do not delete either account or project.
2. Restore the previous environment-variable values in Vercel if they were changed.
3. Point the domain back to the last healthy deployment if DNS was modified.
4. Restore the latest encrypted database backup only if data was damaged; do not overwrite newer orders blindly.
5. Put checkout into maintenance mode if payment or order recording is inconsistent.
6. Record affected order IDs and reconcile Razorpay payments against database orders before reopening checkout.

## Official references

- [GitHub: Transferring a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)
- [Vercel: Transferring a project](https://vercel.com/docs/projects/transferring-projects)
- [Supabase: Project transfers](https://supabase.com/docs/guides/platform/project-transfer)
- [Razorpay documentation](https://razorpay.com/docs/)

Last reviewed: 2 November 2026
