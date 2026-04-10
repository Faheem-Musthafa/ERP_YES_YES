# ADR-004: CI Quality And Release Gates

- Status: Proposed
- Date: 2026-04-10

## Context

The project currently has local scripts for dev, build, and typecheck but no repository CI workflow enforcing baseline quality checks before deployment.

## Decision Drivers

- Prevent regressions from reaching production
- Enforce repeatable checks for schema and app compatibility
- Improve release confidence and team velocity

## Options Considered

1. Manual local checks only
2. Add CI workflow with required quality gates
3. Full staged delivery pipeline with canary/progressive rollout

## Decision

Adopt option 2 immediately, with option 3 as future evolution.

## Consequences

### Positive

- Higher release quality and faster feedback
- Better collaboration and predictable merges
- Lower risk of production outages from avoidable defects

### Negative

- Initial setup effort
- CI runtime cost

## Implementation Plan

1. Add CI workflow for pull requests and main branch:
   - install dependencies
   - typecheck
   - lint
   - build
2. Add SQL migration lint/validation step.
3. Add minimal automated tests for critical domain workflows.
4. Require green checks before merge.
5. Publish build artifacts and changelog summary on successful main build.

## Validation

- Confirm CI blocks merges on failed checks.
- Confirm migration checks catch schema drift and unsafe SQL.
- Track defect escape rate after adoption.
