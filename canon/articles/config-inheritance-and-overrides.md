---
title: "Config Inheritance and Overrides — How Multiple Cfg Files Compose at Runtime"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "mcp", "agent-kb", "v1.2-aligned", "non-canonical", "inheritance", "overrides", "import", "resolution-order"]
derives_from: "canon/governance/headless-operations.md (Part 3 Config inheritance, Part 4 Override Mechanism)"
companion_to: "canon/specs/ptxprint-mcp-v1-2-spec.md"
canonical_status: non_canonical
date: 2026-04-28
status: draft
---

# Config Inheritance and Overrides

> **What this answers.** What does `[import]` do? What are override files? When the agent changes a setting and nothing happens, why?
>
> **Related articles.** `klappy://canon/articles/config-construction` · `klappy://canon/articles/payload-construction` · `klappy://canon/articles/file-system-map`

---

## The five-layer resolution order

When PTXprint resolves the value of any cfg key inside the worker, it walks five layers in order. The first layer that has the key wins:

```
1. Config-level override file:    shared/ptxprint/<config>/ptxprint_override.cfg
2. Project-level override file:   shared/ptxprint/ptxprint_project.cfg
3. Config's own ptxprint.cfg:     shared/ptxprint/<config>/ptxprint.cfg
4. Parent config's ptxprint.cfg:  shared/ptxprint/<parent>/ptxprint.cfg (recursively)
5. PTXprint's built-in defaults
```

Each layer is optional. Most projects have only layers 3 and 5. A project with inheritance adds layer 4. A project with cluster lockdown adds layers 1 and/or 2.

**The agent's most common debugging question is: "I changed layer 3 and nothing happened. Why?"** Answer: layer 1 or 2 is winning. See *Failure modes* below.

## The `[import]` section: config inheritance

A config whose `ptxprint.cfg` contains:

```ini
[import]
config = Default
```

declares that `Default` is its parent. PTXprint loads the parent's full settings first, then layers the child's settings on top. **The child stores only the keys that differ from the parent.**

Inheritance can chain:
```
MySpecial → FancyNT → Default
```

PTXprint resolves the chain by walking from base to most-specific.

### Implications for the agent

- **The agent walks the chain itself before constructing the payload.** Read each parent's `ptxprint.cfg` from project state.

- **Include the chain explicitly in `config_files`.** Don't flatten — let the worker materialize each parent at its expected path, and PTXprint resolves inheritance the way it always does.

  ```json
  "config_files": {
    "shared/ptxprint/MySpecial/ptxprint.cfg": "[config]\nname = MySpecial\n[import]\nconfig = FancyNT\n[paper]\npagesize = ...\n",
    "shared/ptxprint/FancyNT/ptxprint.cfg":   "[config]\nname = FancyNT\n[import]\nconfig = Default\n...",
    "shared/ptxprint/Default/ptxprint.cfg":   "[config]\nname = Default\n..."
  }
  ```

  This preserves the user's intent and makes the payload roundtrip-able to a real project tree.

- **There is no `resolve_config` server tool.** If the agent needs effective settings for reasoning, it computes them from the payload's `config_files` content (or from project state before payload construction).

- **There is no reset mechanism.** A key set in the parent persists in the child unless the child explicitly overrides it.

### When to use inheritance vs a copy

| Use inheritance | Use a copy |
|---|---|
| The new config is a small variant of an existing one | The new config is fundamentally different |
| The user wants changes to the parent to flow to the child | The user wants a snapshot that won't drift |
| Cluster discipline — children customize, parent enforces | (rarely; explain why before doing this) |

Most cases want inheritance.

## Override files: locking settings

The two override files have the same INI shape as `ptxprint.cfg` but mean something different:

```
shared/ptxprint/ptxprint_project.cfg              PROJECT-WIDE
shared/ptxprint/<config>/ptxprint_override.cfg    CONFIG-SPECIFIC
```

An entry in either file does two things:

1. **In headless terms**, the value wins over `ptxprint.cfg` (per the resolution order above).
2. **In the GUI**, the corresponding control is greyed out — the user cannot change it through the UI.

### The `*` prefix: soft lock

A value with `*` prefix is a **soft lock** — the GUI allows temporary change, but the override default is restored when the project is closed and reopened.

```ini
[paper]
pagesize = * 148mm, 210mm (A5)
```

Without the `*`, the lock is **hard** — the GUI doesn't allow change at all.

In headless context, both behave the same — the override value is what the worker sees. The `*` matters when the user later opens the project in the GUI.

### When override files exist

Override files are typically created by:

- **Cluster admins** enforcing house-style across multiple projects.
- **Project leads** locking settings team members keep accidentally changing.
- **Quality control** pinning settings that affect downstream printer workflow.

The agent doesn't usually create them — but must check for them.

## Three failure modes the agent must guard against

### Failure mode 1: silent override

**Symptom:** the agent updates `ptxprint.cfg` content in the payload to change `[paper] pagesize`. The worker runs typesetting. The page size doesn't change.

**Cause:** a project-level override file pinned the page size, and the agent included it (or carried it forward from project state) without updating it.

**Mitigation:** before adding a setting to the payload's `config_files["shared/ptxprint/<config>/ptxprint.cfg"]`, check both override files in project state. If the key is locked there, surface to user:

> "I'm about to set `[paper] pagesize = A5`, but the project-level override at `ptxprint_project.cfg` has it locked to `Letter`. To change it for real, I'd need to update the override file too. Do you want me to?"

### Failure mode 2: breaking cluster lockdown

**Symptom:** the user is part of a publishing cluster whose admin has locked house-style settings via override files. The agent edits the override file in project state to "fix" something. The next Send/Receive (in the user's Paratext / Git workflow) propagates the change to every project in the cluster.

**Mitigation:** treat override files as administrator-controlled. The agent must not modify them in project state — and therefore must not include modified versions in the payload — without explicit user confirmation, with cluster propagation implications spelled out.

> "This change would touch `ptxprint_project.cfg`, which is the cluster-wide lock file. If you Send/Receive after this, the change will reach every project in your cluster. Are you sure?"

### Failure mode 3: orphaned override

**Symptom:** a previous payload (or the user's earlier work) left a value in an override file. Later, the agent updates the same key in the main `ptxprint.cfg` content of the payload, and tells the user the change is in effect. It is not — the override is still in the payload (and in project state).

**Mitigation:** when the agent's payload change does not produce the expected output, check both override files first. The diagnostic checklist in `klappy://canon/articles/diagnostic-patterns` includes this step.

## Authoring an override file

The deck describes the manual workflow: copy `ptxprint.cfg` to the override filename, delete the lines that should NOT be locked, save. The agent does the same:

1. Read the relevant section of the working `ptxprint.cfg`.
2. Extract the keys to lock.
3. Write a new override file at the appropriate path in project state, containing only those keys.
4. Include both the modified main cfg AND the new override file in subsequent payloads.

### When to suggest creating an override file

- The user is administering multiple projects and wants house-style consistency.
- The user wants to enforce a setting that team members cannot accidentally change.
- A specific setting has been "lost" multiple times because team members keep changing it.

### When NOT to create an override file

- The user is making a one-off layout decision for their own project.
- The user is exploring options and may want to revert.
- The user is not aware override files exist (introduce the concept first; do not silently create one).

## The full resolution example

Project `WSG`, config `MySpecial → FancyNT → Default`. The agent submits a payload that sets `[paper] pagesize = A4` in `MySpecial/ptxprint.cfg`. What happens?

```
Layer 1 — MySpecial/ptxprint_override.cfg          not in payload  → skip
Layer 2 — ptxprint_project.cfg                     in payload, no [paper] section  → skip
Layer 3 — MySpecial/ptxprint.cfg                   in payload, [paper] pagesize = A4  → WIN, value = A4
```

A4 is used. Good.

Now suppose `ptxprint_project.cfg` has `[paper] pagesize = Letter`:

```
Layer 1 — MySpecial/ptxprint_override.cfg          not in payload  → skip
Layer 2 — ptxprint_project.cfg                     in payload, [paper] pagesize = Letter  → WIN, value = Letter
Layer 3 — MySpecial/ptxprint.cfg                   has pagesize = A4  → ignored
```

Letter is used. The agent's change to `MySpecial` was silently overridden. This is failure mode 1.

The agent must catch this before submitting. Either:
- Update the override file to remove the lock (with user confirmation, with cluster implications spelled out).
- Tell the user the change cannot take effect without admin authorization.

---

*This article is part of the v1.2-aligned KB split from `canon/governance/headless-operations.md`. See also: `klappy://canon/articles/config-construction` for cfg-section reference and `klappy://canon/articles/diagnostic-patterns` for "my change didn't take effect" debugging.*
