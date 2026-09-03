# Custom Slash Commands

This directory contains custom slash commands for the expense tracker project.

## Available Commands

### `/document-feature <feature-name>`

Generates comprehensive documentation for a feature, creating both developer and user guides.

**Usage:**
```
/document-feature data-export-v2
/document-feature expense-filtering
/document-feature dashboard-charts
```

**What it creates:**
1. **Developer Documentation** (`docs/dev/{feature-name}-implementation.md`)
   - Technical architecture and implementation details
   - Code examples from actual implementation
   - API reference and type definitions
   - Performance considerations and security notes
   - Testing strategies and known issues

2. **User Documentation** (`docs/user/how-to-{feature-name}.md`)
   - Simple, non-technical guide
   - Step-by-step instructions with screenshot placeholders
   - Tips & tricks and troubleshooting
   - Common questions and answers

**Process:**
The command will:
1. Analyze the codebase to find relevant files
2. Extract technical details and code snippets
3. Generate comprehensive developer documentation
4. Create user-friendly guide with visual placeholders
5. Cross-reference both documents

**Example Output:**
For `data-export-v2`, it creates:
- `docs/dev/data-export-v2-implementation.md` (1,117 lines, 29KB)
- `docs/user/how-to-data-export-v2.md` (637 lines, 16KB)

**Note:** After generating documentation, you should:
- Review the generated content for accuracy
- Add actual screenshots to replace placeholders
- Update any feature-specific details
- Keep docs updated as the feature evolves

## Adding New Commands

To create a new slash command:

1. Create a markdown file in `.claude/commands/`
2. Add YAML frontmatter with `description` field
3. Write the command prompt
4. The command will be available as `/filename`

Example:
```markdown
---
description: Short description of what the command does
---

Your command prompt goes here...
```

## Documentation Standards

### Developer Docs
- Use technical terminology
- Include code snippets with syntax highlighting
- Add ASCII diagrams for architecture
- Reference actual line numbers
- Document edge cases and security

### User Docs
- Simple, friendly language
- Numbered step-by-step instructions
- Screenshot placeholders with descriptive names
- Troubleshooting sections
- FAQ format for common questions

## Directory Structure

```
.claude/
└── commands/
    ├── README.md                    # This file
    └── document-feature.md          # Feature documentation generator

docs/
├── dev/                             # Developer documentation
│   └── {feature}-implementation.md
└── user/                            # User documentation
    ├── {how-to-feature}.md
    └── screenshots/                 # Screenshot assets
```

## Tips

- Use descriptive feature names (kebab-case)
- Keep commands focused on specific tasks
- Test commands on actual features
- Update this README when adding new commands
