---
description: Generate comprehensive developer and user documentation for a feature
---

You are tasked with creating comprehensive documentation for a feature in the expense tracker application.

## Input Format

The user will provide a feature name as an argument. Examples:
- `/document-feature data-export-v2`
- `/document-feature expense-filtering`
- `/document-feature dashboard-charts`

## Your Task

For the given feature, generate TWO complete documentation files:

### 1. Developer Documentation
**Location:** `docs/dev/{feature-name}-implementation.md`

**Must Include:**
- **Overview**: High-level description of the feature and its purpose
- **Architecture**: Component structure, data flow diagrams (ASCII art)
- **File Structure**: List of all files involved with their purposes
- **Key Components**: Detailed breakdown of main components/functions
- **API Reference**: Props, parameters, return types, interfaces
- **State Management**: How state is managed (if applicable)
- **Data Flow**: Step-by-step flow of data through the system
- **Dependencies**: External libraries used and why
- **Code Examples**: Real code snippets from the implementation
- **Error Handling**: How errors are caught and handled
- **Performance Considerations**: Optimization notes, bottlenecks
- **Security Notes**: Any security considerations
- **Testing Strategy**: How to test this feature
- **Known Issues**: Current limitations or bugs
- **Future Enhancements**: Planned improvements
- **Related Files**: Cross-references to other relevant code

### 2. User Documentation
**Location:** `docs/user/how-to-{feature-name}.md`

**Must Include:**
- **Overview**: What the feature does in simple terms
- **Use Cases**: When and why users would use this feature
- **Step-by-Step Guide**: Clear numbered instructions
- **Screenshot Placeholders**: `![Screenshot: Description](./screenshots/{feature-name}-step-1.png)`
- **Tips & Tricks**: Best practices and helpful hints
- **Common Issues**: FAQ and troubleshooting
- **Limitations**: What the feature cannot do
- **Related Features**: Links to related documentation

## Process

1. **Analyze the Codebase:**
   - Use Glob to find all relevant files for the feature
   - Use Grep to search for related code patterns
   - Read key implementation files
   - Understand the data flow and architecture

2. **Identify Components:**
   - Find all React components involved
   - Locate utility functions, services, types
   - Map out dependencies

3. **Extract Technical Details:**
   - Function signatures
   - TypeScript interfaces
   - Props and state variables
   - Error handling patterns

4. **Create Developer Documentation:**
   - Write technical, detailed documentation
   - Include code snippets from actual implementation
   - Add ASCII diagrams for data flow
   - Document edge cases and technical decisions

5. **Create User Documentation:**
   - Write in simple, non-technical language
   - Focus on "how to" instructions
   - Add screenshot placeholders
   - Include troubleshooting tips

6. **Cross-Reference:**
   - Link developer docs to user docs
   - Link user docs back to developer docs
   - Reference related features

## Documentation Standards

### Developer Docs Style:
- Use technical terminology
- Include code blocks with syntax highlighting
- Add TypeScript type definitions
- Use tables for API reference
- Include actual file paths with line numbers

### User Docs Style:
- Use simple, friendly language
- Avoid technical jargon
- Use numbered steps
- Add visual placeholders
- Include emoji for visual interest (optional)

## Example Output Structure

### Developer Doc Example:
```markdown
# Feature Name - Implementation Guide

## Overview
[Technical description of what the feature does]

## Architecture

### Component Hierarchy
```
ParentComponent
  └── FeatureComponent
      ├── SubComponent1
      └── SubComponent2
```

### Data Flow
```
User Action → Event Handler → State Update → UI Re-render
```

## File Structure

| File | Purpose | Lines |
|------|---------|-------|
| components/Feature.tsx | Main component | 250 |
| lib/featureService.ts | Business logic | 100 |

## Key Components

### FeatureComponent (components/Feature.tsx:15-200)

**Purpose:** Main UI component for the feature

**Props:**
```typescript
interface FeatureProps {
  data: DataType[];
  onAction: (id: string) => void;
}
```

[Continue with detailed sections...]
```

### User Doc Example:
```markdown
# How to Use [Feature Name]

## What is [Feature Name]?

[Simple explanation in 1-2 sentences]

## When to Use This Feature

- Use case 1
- Use case 2
- Use case 3

## Step-by-Step Guide

### Step 1: [Action Name]

![Screenshot: Initial screen](./screenshots/feature-step-1.png)

1. Navigate to [location]
2. Click on [button name]
3. You should see [expected result]

### Step 2: [Next Action]

![Screenshot: Configuration screen](./screenshots/feature-step-2.png)

[Continue with steps...]

## Tips & Tricks

💡 **Pro Tip:** [Helpful advice]

⚠️ **Important:** [Warning or note]

[Continue with sections...]
```

## Important Notes

- Always create BOTH documentation files
- Use the actual code from the repository - read files to get real examples
- Generate realistic content based on the actual implementation
- Create the docs directories if they don't exist
- Use proper markdown formatting
- Include cross-references between docs
- Add a table of contents for longer documents
- Date stamp the documentation

## After Generation

After creating both files, provide the user with:
1. Confirmation of files created
2. Brief summary of what was documented
3. Suggestion to review and add screenshots to user docs
4. Note any areas that might need manual review
