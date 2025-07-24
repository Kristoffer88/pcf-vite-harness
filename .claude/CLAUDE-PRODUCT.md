# CLAUDE Product Management Guide

## Product as Code (PaC) Workflow

This project uses Product as Code (PaC) v0.1.0 specification for managing product requirements and development tasks as version-controlled YAML files.

### PaC Files Structure
No special commands needed - tickets are simple YAML files that provide AI context.

### Directory Structure
```
.pac/
└── tickets/               # Individual development tickets
```

## Ticket-Driven Development

### Ticket Lifecycle
1. **Creation** - Copy and modify existing ticket from `.pac/tickets/` as reference
2. **Planning** - Define acceptance criteria, tasks, and technical notes  
3. **Implementation** - Create branch: `git checkout -b feature/ticket-XXX-name`
4. **Development** - Work through tasks, updating status as you progress
5. **Completion** - Update ticket status, create PR, link ticket to PR

### Ticket Creation Process

#### Manual Ticket Creation
- **Process**: Copy existing ticket from `.pac/tickets/` as reference
- **Naming**: Use format `ticket-XXX-descriptive-name.yaml`
- **Structure**: Follow existing ticket patterns for consistency
- **Required Updates**:
  - Update metadata (id, name, dates, owner, labels)
  - Fill in spec fields (description, acceptance criteria, tasks)
  - Set appropriate type, status, priority, estimated effort

#### AI Context Benefits
- **Perfect Context**: Tickets provide comprehensive context for Claude Code development
- **Technical Notes**: Detailed implementation guidance for AI assistance
- **Acceptance Criteria**: Clear definition of "done" for AI validation
- **Task Breakdown**: Step-by-step implementation guide
- **Dependencies**: Links between related features for AI understanding

### Ticket Structure (PaC v0.1.0)
```yaml
apiVersion: productascode.org/v0.1.0
kind: Ticket
metadata:
  id: ticket-XXX-descriptive-name
  name: "Human Readable Ticket Name"
  created_at: "2025-01-24"
  owner: "kristoffer"
  labels: ["pcf", "vite", "feature-category"]
spec:
  description: |
    Detailed description with business context
  type: "feature" # feature, bug, enhancement, refactor, test, docs
  status: "todo"  # todo, in-progress, in-review, done
  priority: "high" # low, medium, high, critical
  estimated_effort: "1 week"
  acceptance_criteria: []
  tasks: []
  pull_request:
    branch: "feature/ticket-XXX-name"
    status: "pending"
  related_tickets: []
  technical_notes: |
    Implementation details and architectural decisions
```

## Integration with Development Workflow

### Using Tickets with Claude Code
- **Context Provision**: Tickets provide perfect AI context for development work
- **Scope Management**: Each ticket represents 1-2 weeks of atomic work
- **Dependency Tracking**: Related tickets link features that depend on each other
- **Technical Documentation**: Technical notes preserve architectural decisions

### Branch and PR Workflow
```bash
# Start work on a ticket
git checkout -b feature/ticket-003-context-capture-playwright

# Reference ticket in commits
git commit -m "feat: implement request interception for context capture

Implements core functionality for ticket-003-context-capture-playwright.
Adds Playwright-based request interception to inject context capture
bundle without breaking PCF functionality.

Refs: .pac/tickets/ticket-003-context-capture-playwright.yaml"

# Link PR to ticket
gh pr create --title "Context Capture via Playwright Runtime Inspection" \
  --body "Closes ticket-003-context-capture-playwright"
```

### Ticket Status Management
- **todo**: Ready for implementation
- **in-progress**: Currently being worked on
- **in-review**: Under code review
- **done**: Completed and merged

## Current Active Tickets

### High Priority
- `ticket-003-context-capture-playwright` - Playwright-based runtime context capture
- `ticket-001-dataset-getformattedvalue` - **DEPENDS ON** ticket-003 for realistic dataset contexts
- `ticket-002-dataset-record-consistency` - Fix inconsistent dataset record structures

### Dependencies
- ticket-001 should be implemented **AFTER** ticket-003 completes
- ticket-003 provides production context data needed for accurate getFormattedValue implementation

## Best Practices

### Ticket Creation Guidelines
- **One Feature Per Ticket**: Keep scope focused and atomic
- **Clear Acceptance Criteria**: Define "done" unambiguously  
- **Technical Context**: Include implementation notes for AI assistance
- **Realistic Effort**: Estimate 1-2 weeks max per ticket
- **Dependency Tracking**: Link related tickets explicitly

### Claude Code Integration
- **Reference Tickets**: Mention ticket IDs when working on features
- **Update Status**: Mark tickets in-progress before starting work
- **Technical Notes**: Use ticket technical notes to guide implementation
- **Context Sharing**: Tickets provide perfect context for AI coding assistance

### Quality Standards
- All tickets must pass `npm run pac:validate`
- Follow PaC v0.1.0 specification exactly
- Include comprehensive technical notes
- Link to relevant documentation and code files
- Update ticket status in real-time during development

## Ticket Templates

### Feature Ticket
Use for new functionality that adds value to users.
- High technical notes detail
- Clear business value statement
- Comprehensive acceptance criteria

### Bug Ticket  
Use for fixing existing functionality.
- Root cause analysis in technical notes
- Steps to reproduce
- Regression prevention measures

### Enhancement Ticket
Use for improving existing features.
- Current state vs desired state
- Performance impact considerations
- Backward compatibility notes

## PaC Philosophy

Product as Code treats requirements as first-class code artifacts:
- **Version Controlled**: Product decisions tracked in git history
- **AI Native**: Perfect context for Claude Code development
- **Developer Friendly**: Integrates with existing git/PR workflow
- **Audit Trail**: Complete history of product evolution
- **Collaborative**: Tickets can be created and refined by team members

This approach bridges product management and development execution, ensuring nothing gets lost between requirements and implementation.