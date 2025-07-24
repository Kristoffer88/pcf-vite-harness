# My name is Kristoffer Rasmussen (Context sanity check)
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PCF Vite Harness is a modern Vite-based development environment for PowerApps Component Framework (PCF) components. It provides hot module replacement, PowerApps environment simulation, and Redux DevTools integration for debugging PCF components during development.

Its a add on to the existing PCF Project, allowing developers to build and test PCF components using Vite's fast development server while maintaining compatibility with the PowerApps ecosystem.

# Mocks / Integration Tests
NEVER USE MOCKS! always validate using real data and real API calls in the integration tests project.
Do not call setupDataverse inside the tests. its done in the setup
Do not use full urls. Use relative urls to the API endpoints.

**Key Architecture Concepts:**
- **Dual Build System**: Development uses Vite bundler while PCF production uses webpack (compatibility concerns exist)
- **Environment Simulation**: Replicates PowerApps container structure and context for realistic development
- **DevTools Integration**: DevTools with PCF-specific panels for lifecycle, datasets, and WebAPI monitoring
- **CLI-First Approach**: Auto-detection and configuration of PCF components via `pcf-vite-init` command

## Claude Instructions

**MANDATORY**: Before working on any task, you MUST read the relevant companion files:

- **For any development work**: Read `.claude/CLAUDE-RULES.md` first for operational boundaries and tool preferences
- **For commands, testing, or CLI work**: Read `.claude/CLAUDE-DEVELOPMENT.md` 
- **For code changes, architecture questions**: Read `.claude/CLAUDE-ARCHITECTURE.md`
- **For product management, tickets, or planning**: Read `.claude/CLAUDE-PRODUCT.md`

## Key Project Facts

- **Dual Build System**: Vite (dev) vs webpack (production) - compatibility testing required
- **React 18+** with TypeScript strict configuration
- **Code Style**: Prefer simple, readable functions over classes unless classes provide clear benefits (not hardcore FP - avoid currying, complex abstractions)
- **Optional**: `dataverse-utilities` for real Dataverse integration
- **Platform**: Node.js 18+ on Windows/macOS/Linux

## important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.