# Demo3 Template Skill

This skill tells the agent how to use the `templates/demo3` project as a reusable starting point.

## Use This Skill When

- the user asks to use `demo3`,
- the user asks for a dashboard or admin-style React starter,
- the user wants a fast starting point instead of building a project from scratch,
- the request matches the structure already present in `templates/demo3`.

## Template Source

- Template path: `templates/demo3`
- Template type: reusable React dashboard starter

## Workflow

1. Inspect `templates/demo3` before making assumptions.
2. Reuse the existing structure when it fits the request.
3. Copy or adapt the template into the target project instead of editing the template unless the user explicitly wants the base template improved.
4. Preserve reusable setup files unless the target project requires changes.
5. Customize pages, routes, branding, text, assets, and components based on the user request.
6. If a useful improvement is generic, consider saving it back into the template.

## Notes

- Treat `demo3` as an available default template inside this repo.
- Prefer adapting it for dashboard-style work over rebuilding the same scaffold repeatedly.
- If the user says "use demo3", start from this template first.
