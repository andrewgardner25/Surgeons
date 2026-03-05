# SurgeonOS — Theatre Notes Matcher

A personal surgical notes tool that connects to Notion and pulls relevant technique tips based on your theatre list.

## Setup

### Environment Variables
Add this to your Vercel project settings under Environment Variables:
- `NOTION_TOKEN` = your Notion integration token (starts with `ntn_` or `secret_`)

### Notion Setup
- Create a page called "Surgical Technique Notes"
- Add sub-pages for each procedure (one page per procedure)
- Connect your Notion integration to the parent page

## Deployment
Deploy to Vercel by importing this repository.
