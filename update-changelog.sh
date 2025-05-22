#!/bin/bash

# Script to update changelogs after pushing to main branch
# Run this script manually after pushing to main: ./update-changelog.sh

# Configuration
CHANGELOG_WEBHOOK_URL="https://ycwttshvizkotcwwyjpt.supabase.co/functions/v1/changelog-webhook"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3R0c2h2aXprb3Rjd3d5anB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNDQ5NzUsImV4cCI6MjA1MzgyMDk3NX0.7Mn5vXXre0KwW0lKgsPv1lwSXn5CiRjTRMw2RuH_55g"

# Get the latest commit message
COMMIT_MSG=$(git log -1 --pretty=%B)
echo "Latest commit message:"
echo "$COMMIT_MSG"
echo

# Extract title without any "Update changelogs for:" prefix
TITLE=$(echo "$COMMIT_MSG" | head -n 1)
if [[ "$TITLE" == "Update changelogs for:"* ]]; then
  # Get the original commit message from previous commit
  echo "Changelog update commit detected, extracting original information..."
  ORIGINAL_TITLE=$(echo "$TITLE" | sed 's/^Update changelogs for: //')
  TITLE="$ORIGINAL_TITLE"
  
  # Get the second-to-last commit for content
  COMMIT_MSG=$(git log -2 --pretty=%B | sed -n '4,$p')
  echo "Using original commit message:"
  echo "$COMMIT_MSG"
fi

# Extract the title and content manually
if [ -f "temp-changelog-input.txt" ]; then
  echo "Found temp-changelog-input.txt, using content from file..."
  TEMP_CONTENT=$(cat temp-changelog-input.txt)
  
  # Extract title (first line)
  TITLE=$(echo "$TEMP_CONTENT" | head -n 1)
  
  # Find lessons learned section
  LESSONS_LINE=$(echo "$TEMP_CONTENT" | grep -n "Lessons Learned:" | cut -d ":" -f 1)

  # Extract content and lessons
  if [ -n "$LESSONS_LINE" ]; then
    CONTENT=$(echo "$TEMP_CONTENT" | tail -n +2 | head -n $(($LESSONS_LINE - 2)))
    LESSONS=$(echo "$TEMP_CONTENT" | tail -n +$(($LESSONS_LINE + 1)))
  else
    # No lessons learned section found, use everything after title as content
    CONTENT=$(echo "$TEMP_CONTENT" | tail -n +2)
    LESSONS=""
  fi
  
  echo "Using title: $TITLE"
  echo "Content extracted ($(echo "$CONTENT" | wc -l) lines)"
  if [ -n "$LESSONS" ]; then
    echo "Lessons learned extracted ($(echo "$LESSONS" | wc -l) lines)"
  fi
else
  echo "Enter the original title (press Enter to use: \"$TITLE\"):"
  read -r USER_TITLE
  if [[ -n "$USER_TITLE" ]]; then
    TITLE="$USER_TITLE"
  fi

  # Now grab content from a multi-line input
  echo "Enter the content (key achievements, changes, improvements):"
  echo "Press Ctrl+D when finished."
  CONTENT=$(cat)

  # Ask for lessons learned
  echo "Enter lessons learned (press Ctrl+D when finished):"
  LESSONS=$(cat)
fi

# Format date for documentation
DATE=$(date "+%B %d, %Y")

# Create progress.md update
PROGRESS_UPDATE="
## $DATE
### $TITLE
$CONTENT
"

# Create lessons_learn.md update
if [ -n "$LESSONS" ]; then
  LESSONS_UPDATE="
## $TITLE ($DATE)
$(echo "$LESSONS" | sed 's/^/- /')
"
else
  LESSONS_UPDATE=""
fi

# Ensure files exist
if [ ! -f "progress.md" ]; then
  echo "# Progress Log" > progress.md
  echo >> progress.md
fi

if [ ! -f "lessons_learn.md" ] && [ -n "$LESSONS" ]; then
  echo "# Lessons Learned" > lessons_learn.md
  echo >> lessons_learn.md
fi

# Update files
echo "$PROGRESS_UPDATE" >> progress.md
echo "✅ Updated progress.md with latest changes"

if [ -n "$LESSONS" ]; then
  echo "$LESSONS_UPDATE" >> lessons_learn.md
  echo "✅ Updated lessons_learn.md with lessons learned"
fi

# Determine category based on commit message
CATEGORY="other"
if [[ "$COMMIT_MSG" =~ (fix|bug|patch) ]]; then
  CATEGORY="bugfix"
elif [[ "$COMMIT_MSG" =~ (feat|add|new) ]]; then
  CATEGORY="feature"
elif [[ "$COMMIT_MSG" =~ (improve|update|enhance) ]]; then
  CATEGORY="enhancement"
elif [[ "$COMMIT_MSG" =~ (doc|readme) ]]; then
  CATEGORY="documentation"
elif [[ "$COMMIT_MSG" =~ (test) ]]; then
  CATEGORY="testing"
elif [[ "$COMMIT_MSG" =~ (refactor) ]]; then
  CATEGORY="refactor"
fi

echo "Detected category: $CATEGORY"
echo "You can change the category if needed (press Enter to keep '$CATEGORY'):"
echo "Options: bugfix, feature, enhancement, documentation, testing, refactor, other"
read -r USER_CATEGORY
if [[ -n "$USER_CATEGORY" ]]; then
  CATEGORY="$USER_CATEGORY"
fi

# Get changed files
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

# Determine dev team
if echo "$CHANGED_FILES" | grep -q "frontend/"; then
  if echo "$CHANGED_FILES" | grep -q "backend/\|supabase/"; then
    DEV_TEAM="Full Stack team"
  else
    DEV_TEAM="Frontend team"
  fi
elif echo "$CHANGED_FILES" | grep -q "backend/\|supabase/"; then
  DEV_TEAM="Backend team"
else
  DEV_TEAM="Development team"
fi

echo "Developer team: $DEV_TEAM"

# Create a temporary JSON file with proper formatting
TEMP_JSON_FILE=$(mktemp)

# Format lessons learned if available
if [ -n "$LESSONS" ]; then
  # Format lessons with proper markdown bullets
  FORMATTED_LESSONS=""
  while IFS= read -r line; do
    if [[ -n "$line" && ! "$line" =~ ^[-*] ]]; then
      FORMATTED_LESSONS="${FORMATTED_LESSONS}- ${line}"$'\n'
    else
      FORMATTED_LESSONS="${FORMATTED_LESSONS}${line}"$'\n'
    fi
  done <<< "$LESSONS"
  
  # Use jq to properly format JSON
  LESSONS_JSON="**Lessons Learned:**"$'\n\n'"${FORMATTED_LESSONS}"
else
  LESSONS_JSON=""
fi

# Use a python script to properly escape and format the JSON
python3 -c "
import json
import sys
data = {
    'title': '${TITLE}',
    'content': '''${CONTENT}''',
    'category': '${CATEGORY}',
    'release_date': '$(date -u +"%Y-%m-%dT%H:%M:%SZ")',
    'released_by': 'Benjie Malinao',
    'dev': '${DEV_TEAM}',
    'lessons_learned': '''${LESSONS_JSON}''' if '''${LESSONS_JSON}''' else None
}
with open('${TEMP_JSON_FILE}', 'w') as f:
    json.dump(data, f, indent=2)
"

echo "Created webhook payload:"
cat "$TEMP_JSON_FILE"

# Ask for confirmation before sending webhook
if [ -f "temp-changelog-input.txt" ]; then
  # Automatically proceed if using temp file
  WEBHOOK_CONFIRM="y"
else
  echo "Ready to send changelog to webhook. Continue? (y/n)"
  read -r WEBHOOK_CONFIRM
fi

if [[ ! $WEBHOOK_CONFIRM =~ ^[Yy]$ ]]; then
  echo "Webhook send cancelled."
else
  # Send the webhook request using the temporary file and store response in a variable
  echo "Sending webhook request to: $CHANGELOG_WEBHOOK_URL"
  RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    --data-binary @"$TEMP_JSON_FILE" \
    "$CHANGELOG_WEBHOOK_URL")

  echo "Webhook response:"
  echo "$RESPONSE"

  # Extract post ID from response
  POST_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ -n "$POST_ID" ]; then
    echo "✅ Successfully created changelog entry with post ID: $POST_ID"
  else
    echo "⚠️ Warning: Could not extract post ID from response"
  fi
fi

# Clean up the temporary file
rm "$TEMP_JSON_FILE"

# Commit the changelog updates
if [ -f "temp-changelog-input.txt" ]; then
  # Automatically proceed if using temp file
  REPLY="y"
  # Remove the temp file after using it
  rm temp-changelog-input.txt
else
  read -p "Do you want to commit the changelog updates? (y/n) " -n 1 -r
  echo
fi

if [[ $REPLY =~ ^[Yy]$ ]]; then
  git add progress.md lessons_learn.md
  git commit -m "Update changelogs: $TITLE"
  echo "✅ Committed changelog updates"
fi
