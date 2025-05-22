import axios from 'axios';
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Post-Push Changelog Script
 * 
 * This script extracts information from the latest commit message and sends it to the changelog webhook.
 * 
 * Required commit message format:
 * 
 * Title of Change
 * 
 * Key details and bullet points
 * - Point 1
 * - Point 2
 * - Point 3
 * 
 * Lessons Learned:
 * - Lesson 1
 * - Lesson 2
 * - Lesson 3
 * 
 * Example payload:
 * {
 *   "title": "Your Title",
 *   "content": "Your Content",
 *   "category": "feature",
 *   "release_date": "2023-08-15T12:00:00Z",
 *   "released_by": "Your Name",
 *   "dev": "Your Team",
 *   "lessons_learned": "**Lessons Learned:**\n\n- First lesson point\n- Second lesson point\n- Third lesson point"
 * }
 */

// Configuration
const CHANGELOG_WEBHOOK_URL = 'https://ycwttshvizkotcwwyjpt.supabase.co/functions/v1/changelog-webhook';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3R0c2h2aXprb3Rjd3d5anB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNDQ5NzUsImV4cCI6MjA1MzgyMDk3NX0.7Mn5vXXre0KwW0lKgsPv1lwSXn5CiRjTRMw2RuH_55g';

/**
 * Parse the commit message to extract title, content, and lessons learned
 */
function parseCommitMessage(message) {
  if (!message || typeof message !== 'string') {
    console.error('Invalid commit message:', message);
    return { title: 'Unknown', content: '', lessons: null };
  }

  const lines = message.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    console.error('Empty commit message');
    return { title: 'Unknown', content: '', lessons: null };
  }
  
  // Get title from first line
  const title = lines[0];
  
  // Find the lessons learned section more robustly
  const lessonIndex = lines.findIndex(line => 
    line.toLowerCase().includes('lesson') && 
    line.toLowerCase().includes('learned')
  );
  
  // Get content by joining all lines between title and lessons learned section
  const contentLines = lessonIndex !== -1 ? lines.slice(1, lessonIndex) : lines.slice(1);
  const content = contentLines.join('\n').trim();
  
  // Extract lessons learned
  let lessons = null;
  if (lessonIndex !== -1 && lessonIndex < lines.length - 1) {
    const lessonLines = lines.slice(lessonIndex + 1)
      .filter(line => line.trim())
      .map(line => {
        // Ensure each lesson starts with a dash
        const trimmed = line.trim();
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          return `- ${trimmed.substring(1).trim()}`;
        }
        return `- ${trimmed}`;
      });
    
    if (lessonLines.length > 0) {
      lessons = '**Lessons Learned:**\n\n' + lessonLines.join('\n');
    }
  }

  return { title, content, lessons };
}

/**
 * Get information from the latest commit
 */
async function getCommitInfo() {
  try {
    // Get the latest commit message
    const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
    console.log('Raw commit message:', commitMessage);
    
    const { title, content, lessons } = parseCommitMessage(commitMessage);
    
    // Get changed files to determine dev team
    const changedFiles = execSync('git diff-tree --no-commit-id --name-only -r HEAD').toString().trim().split('\n');
    
    // Determine dev team based on changed files
    const isFrontend = changedFiles.some(file => file.startsWith('frontend/'));
    const isBackend = changedFiles.some(file => file.startsWith('backend/') || file.startsWith('supabase/'));
    const devTeam = isFrontend && isBackend ? 'Full Stack team' : 
                   isFrontend ? 'Frontend team' : 
                   isBackend ? 'Backend team' : 'Development team';

    // Determine category based on commit message
    const category = determineCategory(commitMessage.toLowerCase());

    const commitInfo = {
      title: title || 'Unknown',
      content: content || '',
      category,
      release_date: new Date().toISOString(),
      released_by: "Benjie Malinao",
      dev: devTeam,
      lessons_learned: lessons || ""
    };

    // Validate the commit info
    validateCommitInfo(commitInfo, commitMessage);

    return commitInfo;
  } catch (error) {
    console.error('Error getting commit info:', error);
    throw error;
  }
}

/**
 * Validate that the commit info has all required fields
 */
function validateCommitInfo(commitInfo, rawMessage) {
  const missingFields = [];
  
  if (!commitInfo.title || commitInfo.title === 'Unknown') {
    missingFields.push('title');
  }
  
  if (!commitInfo.content) {
    missingFields.push('content');
  }
  
  if (!commitInfo.lessons_learned) {
    missingFields.push('lessons_learned');
  }
  
  if (missingFields.length > 0) {
    console.warn(`⚠️ Warning: The following fields are missing or empty: ${missingFields.join(', ')}`);
    console.warn('Please ensure your commit message follows the required format:');
    console.warn(`
Title of Change

Key details and bullet points
- Point 1
- Point 2
- Point 3

Lessons Learned:
- Lesson 1
- Lesson 2
- Lesson 3
    `);
    
    if (rawMessage) {
      console.warn('Your current commit message:');
      console.warn(rawMessage);
    }
    
    // Continue with the process, but warn the user
  }
}

/**
 * Determine the category based on the commit message
 */
function determineCategory(message) {
  if (message.includes('fix') || message.includes('bug') || message.includes('patch')) {
    return 'bugfix';
  }
  if (message.includes('feat') || message.includes('add') || message.includes('new')) {
    return 'feature';
  }
  if (message.includes('improve') || message.includes('update') || message.includes('enhance')) {
    return 'enhancement';
  }
  if (message.includes('doc') || message.includes('readme')) {
    return 'documentation';
  }
  if (message.includes('test')) {
    return 'testing';
  }
  if (message.includes('refactor')) {
    return 'refactor';
  }
  return 'other';
}

/**
 * Send the changelog information to the webhook
 */
async function sendChangelogWebhook(commitInfo) {
  try {
    const response = await axios.post(CHANGELOG_WEBHOOK_URL, commitInfo, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    console.log('Changelog webhook sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending changelog webhook:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Check if we're on the main branch
 */
function isMainBranch() {
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    return currentBranch === 'main';
  } catch (error) {
    console.error('Error checking branch:', error);
    return false;
  }
}

// Main execution
async function main() {
  try {
    // Only run on the main branch
    if (!isMainBranch()) {
      console.log('Not on main branch, skipping changelog update');
      return;
    }

    console.log('Getting commit info...');
    const commitInfo = await getCommitInfo();
    
    console.log('Sending changelog webhook...');
    console.log('Changelog data:', JSON.stringify(commitInfo, null, 2));
    await sendChangelogWebhook(commitInfo);
    console.log('Changelog updated successfully!');

    // Format current date for documentation
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Use the actual commit info to update progress.md
    const progressUpdate = `
## ${formattedDate}
### ${commitInfo.title}
${commitInfo.content}
`;

    // Use the actual commit info to update lessons_learn.md
    const lessonsUpdate = `
## ${commitInfo.title} (${formattedDate})
${commitInfo.lessons_learned.replace('**Lessons Learned:**\n\n', '')}
`;

    // Check if files exist before updating
    if (!fs.existsSync('progress.md')) {
      fs.writeFileSync('progress.md', '# Progress Log\n\n');
    }
    
    if (!fs.existsSync('lessons_learn.md')) {
      fs.writeFileSync('lessons_learn.md', '# Lessons Learned\n\n');
    }

    // Update the files
    fs.appendFileSync('progress.md', progressUpdate);
    fs.appendFileSync('lessons_learn.md', lessonsUpdate);

    // Log the updates
    console.log(`Updated progress.md and lessons_learn.md with ${commitInfo.title} information`);
  } catch (error) {
    console.error('Error in post-push script:', error);
    process.exit(1);
  }
}

main();
