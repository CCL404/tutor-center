# Obsidian Sync Rules

## Trigger Conditions
Sync project info to Obsidian vault when:
1. A new project is scaffolded (like tutor-center)
2. Infrastructure is set up (Supabase/Vercel domains, URLs, keys)
3. Major feature milestones are completed
4. User explicitly asks for a status update

## What to Sync (per project)
1. Update `Projects/<project-name>.md` in the vault
2. Template: `tutor-center/Templates/project-template.md`
3. Always include:
   - Current status (emoji prefix: 🚧/✅/⏸️)
   - Infrastructure URLs and account info
   - File paths
   - Recent changes / decisions
   - Updated to-do list

## Vault Location
`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/second_brain/macmini_m4/`

## Security Note
- Credentials (API keys, passwords) should be stored in the Infrastructure table
- DO NOT write these to any public/git-tracked file
- The Obsidian vault is local (not pushed to git), so it's acceptable to store here
- BUT still avoid storing in cloud-shared vaults if possible

## Sync Method
Direct filesystem write to the vault directory.
Obsidian watches the filesystem and syncs automatically.
