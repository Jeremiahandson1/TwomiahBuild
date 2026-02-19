# Purge Uploaded Files from Git History

There are customer/demo photos committed to the repo under
`templates/website/build/uploads/`. Run this **once** to scrub them from history:

```bash
# Install git-filter-repo if not installed
pip install git-filter-repo

# Remove the uploads directory from all history
git filter-repo --path templates/website/build/uploads/ --invert-paths --force

# Force push all branches
git push origin --force --all
git push origin --force --tags
```

After running, all collaborators must re-clone. The files are now
in .gitignore so they won't be committed again.
