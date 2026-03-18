#!/bin/bash

# Git Email Fix Script
# Usage: ./fix_git_emails.sh

echo "🔧 Git Email Contribution Fix Script"
echo "=================================="

# Configuration
CORRECT_EMAIL="nipunsujesh28@gmail.com"
CORRECT_NAME="Nipun Sujesh"

# List of wrong emails to fix (add more if needed)
WRONG_EMAILS=(
    "nipunsujesh28@email.com"
    "your@email.com"
    "noreply@github.com"
    # Add any other wrong emails you've used
)

echo "Current directory: $(pwd)"
echo "Correct email: $CORRECT_EMAIL"
echo "Correct name: $CORRECT_NAME"

# Check if we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Show current emails in repo
echo ""
echo "📧 Current emails in this repo:"
git log --format='%ae' | sort -u

echo ""
read -p "Continue with email fix? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Build filter-branch command
echo "🔄 Fixing commit emails..."

# Create env-filter script
ENV_FILTER=""
for wrong_email in "${WRONG_EMAILS[@]}"; do
    ENV_FILTER="$ENV_FILTER
if [ \"\$GIT_COMMITTER_EMAIL\" = \"$wrong_email\" ]; then
    export GIT_COMMITTER_NAME=\"$CORRECT_NAME\"
    export GIT_COMMITTER_EMAIL=\"$CORRECT_EMAIL\"
fi
if [ \"\$GIT_AUTHOR_EMAIL\" = \"$wrong_email\" ]; then
    export GIT_AUTHOR_NAME=\"$CORRECT_NAME\"
    export GIT_AUTHOR_EMAIL=\"$CORRECT_EMAIL\"
fi"
done

# Run filter-branch
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --env-filter "$ENV_FILTER" --tag-name-filter cat -- --branches --tags

if [ $? -eq 0 ]; then
    echo "✅ Email fix completed successfully!"
    echo ""
    echo "📧 Updated emails in repo:"
    git log --format='%ae' | sort -u
    echo ""
    echo "🚀 Ready to force push with: git push --force-with-lease --all"
    echo "⚠️  WARNING: This will rewrite history. Make sure teammates are aware."
    echo ""
    read -p "Push changes now? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Force pushing..."
        git push --force-with-lease --all
        git push --force-with-lease --tags
        echo "✅ All done! Check your GitHub contributions in 24 hours."
    else
        echo "📝 Run 'git push --force-with-lease --all' when ready."
    fi
else
    echo "❌ Error occurred during email fix."
    exit 1
fi