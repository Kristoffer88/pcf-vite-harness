# Product as Code (PaC) for PCF Vite Harness

This directory contains Product as Code specification files for the PCF Vite Harness project, following the [Product as Code Specification v0.1.0](https://github.com/productascode/pac-specification).

## About Product as Code

Product as Code is a methodology that treats product requirements as version-controlled, structured data. It enables AI-enhanced code generation by providing perfect context alongside the codebase.

**Specification Repository**: https://github.com/productascode/pac-specification

## Structure

- `tickets/` - Individual development tickets following PaC v0.1.0 format

## File Naming Convention

- Tickets: `ticket-{id}-{descriptive-name}.yaml` (e.g., `ticket-001-dataset-getformattedvalue.yaml`)

## Usage

Each file follows the Product as Code specification format with:
- `apiVersion: productascode.org/v0.1.0`
- `kind: Ticket`
- `metadata` with unique identifiers
- `spec` with detailed requirements and context

## Workflow Integration

See `.claude/CLAUDE-PRODUCT.md` for complete documentation on:
- Ticket-driven development workflow
- Integration with Claude Code development
- Branch and PR management
- Current active tickets and dependencies

## Creating New Tickets

1. Copy an existing ticket from `tickets/` as reference
2. Update metadata (id, name, dates, labels)
3. Fill in spec fields (description, acceptance criteria, tasks)
4. Commit to version control alongside code changes

The tickets provide comprehensive AI context for development work without requiring additional tooling or validation.