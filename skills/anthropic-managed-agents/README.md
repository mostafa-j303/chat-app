# Anthropic Managed Agents Skill

This skill helps the agent create and configure Anthropic Managed Agents, especially Browser Use Cloud scraping agents.

## Use This Skill When

- creating a new Anthropic Managed Agent,
- writing system prompts for managed agents,
- setting up Browser Use Cloud extraction workflows,
- preparing CLI commands for agent creation, environments, or sessions,
- building a structured scraping agent that submits normalized data.

## Preferred Focus

- keep system prompts explicit and tool-oriented,
- use Browser Use for dynamic or SPA pages,
- normalize outputs into arrays of objects,
- never invent missing values,
- keep prose short when tool output is the source of truth.

## Workflow

1. Understand the agent's job, tools, and expected payload shape.
2. Start from a reusable prompt template when one exists.
3. Keep CLI or SDK examples shell-safe and JSON-safe.
4. Separate system prompt text from command text when quoting gets fragile.
5. Save strong prompt patterns as reusable templates.

## Notes

- Managed-agent setup knowledge does not automatically install CLIs or create remote agents.
- If a project needs Browser Use, Anthropic CLI, or SDK code, those still need to exist in the target environment.
- Use the matching template in `templates/anthropic-managed-agents/` when creating the web scraper agent.
