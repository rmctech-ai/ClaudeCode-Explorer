# Claude Code Cheat Sheet

_Auto-generated from the Claude Code Explorer lessons. One master memory hook + the key commands per lesson._

## 01 · What is Claude Code?

> ★ Gather context → take action → verify → repeat. You approve the risky parts.

| Command | What it does |
|---|---|
| `claude` | start in a project |
| `gather → act → verify` | agent loop |
| `Read · Grep · Glob` | no permission needed |
| `Edit · Write · Bash` | ask unless allowed |
| `Esc · /rewind` | stop · undo |
| `npm i -g @anthropic-ai/claude-code` | install |

**Memory hooks:**

- **An agent, not autocomplete**: Give a goal, not keystrokes. Review the diff.
- **The agent loop**: Gather → act → verify. Give Claude a way to check its own work.
- **Tools**: Read-only tools run freely. Edit and Bash ask (unless you allow them).
- **Where it runs**: CLI · IDE · desktop · web · CI: same agent, same config files.
- **You stay in control**: Esc to stop · /rewind to undo · git diff to review.

## 02 · CLAUDE.md & Context

> ★ CLAUDE.md = onboarding notes loaded every session. Short, specific, with commands.

| Command | What it does |
|---|---|
| `/init` | draft CLAUDE.md |
| `./CLAUDE.md · ~/.claude/CLAUDE.md` | team · personal |
| `@path` | import a file |
| `/context` | what fills the window |
| `/clear · /compact` | fresh start · summarize |
| `no secrets` | it is committed |

**Memory hooks:**

- **What goes in CLAUDE.md**: /init, then edit: commands · conventions · architecture · rules.
- **Where memory lives**: ~/.claude/CLAUDE.md (you) · ./CLAUDE.md (team) · @imports for details.
- **The context window**: /context shows what fills the desk.
- **Manage it**: New task → /clear. Long task → /compact. Big search → subagent.
- **Keep it short and true**: Short · current · no secrets · update when Claude repeats a mistake.

## 03 · Explore → Plan → Code → Commit

> ★ Explore → plan (Shift+Tab to plan mode) → code with tests → commit.

| Command | What it does |
|---|---|
| `explore → plan → code → commit` | workflow |
| `Shift+Tab` | cycle to plan mode |
| `--permission-mode plan` | start in plan mode |
| `tests first, small steps` | verify |
| `gh pr create` | Claude opens PRs |
| `Esc · Esc Esc · /rewind` | course-correct |

**Memory hooks:**

- **Explore first**: "Read and explain, don't change anything yet."
- **Plan mode**: Shift+Tab → plan mode: Claude plans, can't edit. Review, then approve.
- **Code with verification**: Test first, small steps, show me the evidence (tests, plan output).
- **Commit and PR**: Claude writes commits and PRs; you review; risky git stays gated.
- **Course-correct early**: Specific prompts · Esc early · /rewind when needed.

## 04 · Permissions & Settings

> ★ deny beats ask beats allow. Team rules in .claude/settings.json; personal in settings.local.json.

| Command | What it does |
|---|---|
| `allow · ask · deny` | rule lists |
| `deny > ask > allow > mode` | precedence |
| `Bash(git push:*)` | prefix rule |
| `Read(./secrets/**)` | path rule |
| `settings.local.json` | personal, git-ignored |
| `bypassPermissions` | sandbox only |

**Memory hooks:**

- **Rule syntax**: Tool(specifier): Bash(prefix:*), Read(path/**), WebFetch(domain:x), mcp__server.
- **Precedence**: Deny wins. Then ask. Then allow. Then the mode.
- **Scopes**: user · project (committed) · local (git-ignored) · managed (org).
- **Permission modes**: bypassPermissions only in a sandbox. Never with real credentials.
- **A secure baseline**: Deny secrets · ask for push/apply · allow tests and read-only git.

## 05 · Hooks

> ★ Hooks = deterministic rules. PreToolUse + exit 2 = blocked. Exit 1 blocks nothing.

| Command | What it does |
|---|---|
| `"hooks": { Event: [ { matcher, hooks } ] }` | config shape |
| `PreToolUse + exit 2` | block |
| `exit 1` | does NOT block |
| `stdin JSON: tool_name, tool_input` | hook input |
| `PostToolUse` | format / lint |
| `$CLAUDE_PROJECT_DIR` | portable script paths |

**Memory hooks:**

- **Configure a hook**: "hooks": { Event: [ { matcher, hooks: [ { type: "command", command } ] } ] }
- **Input and exit codes**: exit 0 = go · exit 2 = block (stderr → Claude) · exit 1 = does NOT block.
- **A protect-files hook**: read stdin → match → echo reason >&2 → exit 2.
- **PostToolUse: format and check**: PostToolUse(Edit|Write) → formatter. Can't undo, can inform.
- **Other events**: SessionStart · UserPromptSubmit · Stop · Notification.

## 06 · Agent Skills, Commands & Plugins

> ★ SKILL.md = name + description (when to use) + steps. Loaded only when relevant.

| Command | What it does |
|---|---|
| `.claude/skills/<name>/SKILL.md` | project skill |
| `~/.claude/skills` | personal skills |
| `name + description (what + when)` | frontmatter |
| `progressive disclosure` | load on demand |
| `/skill-name args` | invoke |
| `/plugin` | install bundles |

**Memory hooks:**

- **Anatomy of a skill**: .claude/skills/<name>/SKILL.md · name + description + steps.
- **Progressive disclosure**: Description decides WHEN. Body loads only then.
- **Scripts and references**: Scripts for exact work, reference files for depth, trusted sources only.
- **Slash commands**: /skill-name args = run it now.
- **Plugins and marketplaces**: Plugin = skills + agents + hooks + MCP, installed with /plugin.

## 07 · Subagents

> ★ Subagent = own prompt + own context + limited tools. Returns a summary, not its whole search.

| Command | What it does |
|---|---|
| `.claude/agents/<name>.md` | subagent file |
| `name · description · tools · model` | frontmatter |
| `own context, returns summary` | why delegate |
| `Read, Grep, Glob` | read-only reviewer |
| `Explore · Plan` | built-in |
| `/agents` | manage |

**Memory hooks:**

- **Define a subagent**: name · description (when) · tools (least privilege) · model · prompt.
- **Separate context**: Big reading happens in the subagent. You get the summary.
- **Least-privilege tools**: Reviewer: Read, Grep, Glob. Never Edit/Bash unless the job needs it.
- **Built-in and automatic delegation**: Good description = automatic delegation. Or ask by name.
- **Subagents vs skills vs MCP**: Skill = know-how · Subagent = worker · MCP = connection · Hook = rule.

## 08 · MCP: Connect Claude to Your Tools

> ★ MCP = USB-C for AI: one protocol, any tool. Server exposes tools · resources · prompts.

| Command | What it does |
|---|---|
| `tools · resources · prompts` | primitives |
| `stdio · Streamable HTTP` | transports |
| `claude mcp add --transport http name url` | add remote |
| `.mcp.json` | project scope |
| `${ENV_VAR}` | no inline secrets |
| `mcp__server__tool` | permission rules |

**Memory hooks:**

- **Why MCP**: Write the server once, use it in every MCP client.
- **Transports**: Local process → stdio. Remote URL → HTTP (+ OAuth).
- **Scopes and .mcp.json**: .mcp.json = team servers (committed). Tokens via ${ENV_VAR}, never inline.
- **Primitives**: Tools = model calls · Resources = app reads · Prompts = user picks.
- **MCP security**: Trusted servers · read-only tokens · env vars · deny/ask for dangerous MCP tools.

## 09 · Build an MCP Server

> ★ @mcp.tool() + docstring + type hints = a tool with name, description and schema.

| Command | What it does |
|---|---|
| `FastMCP("name")` | Python server |
| `@mcp.tool() + docstring + hints` | tool |
| `{ name, description, inputSchema }` | on the wire |
| `@mcp.resource(uri) · @mcp.prompt()` | data · templates |
| `npx @modelcontextprotocol/inspector` | test |
| `sampling · roots · OAuth` | advanced |

**Memory hooks:**

- **A FastMCP server**: FastMCP("name") · @mcp.tool() · docstring · mcp.run().
- **Tool definitions**: Specific name · when-to-use description · strict JSON Schema.
- **Resources and prompts**: @mcp.resource(uri) for data · @mcp.prompt() for templates.
- **Test and connect**: Inspector first → claude mcp add → use it.
- **Advanced topics**: Sampling · roots · progress · elicitation · OAuth.

## 10 · The Claude Messages API

> ★ model + max_tokens + system (top level) + messages (user/assistant) → content + stop_reason + usage.

| Command | What it does |
|---|---|
| `POST /v1/messages` | endpoint |
| `model · max_tokens · messages` | required |
| `system (top-level)` | not a role |
| `x-api-key + anthropic-version` | headers |
| `end_turn · max_tokens · tool_use` | stop_reason |
| `cache_control · batches` | cost control |

**Memory hooks:**

- **The request**: system is top-level. Messages alternate, starting with user.
- **Authentication and SDKs**: Key from env/secrets → x-api-key header. Never in code or JSON files.
- **The response**: stop_reason max_tokens = answer cut off → raise max_tokens.
- **Streaming and cost control**: Right model · short prompts · cache repeated context · batch bulk work.
- **Common errors**: 400 fix the request · 401 key · 429 back off · overloaded → retry.

## 11 · Tool Use & Agent Patterns

> ★ tools → tool_use (Claude) → your code runs it → tool_result (same id) → repeat → end_turn.

| Command | What it does |
|---|---|
| `tools: name · description · input_schema` | define |
| `stop_reason: tool_use` | Claude wants a tool |
| `tool_result in a user message` | same tool_use_id |
| `is_error: true` | report failures |
| `tool_choice: { type: tool, name }` | force a schema |
| `chain · route · parallel · agent` | patterns |

**Memory hooks:**

- **Define tools**: Descriptions drive tool choice. Schemas drive correct arguments.
- **tool_use**: stop_reason tool_use → read name + input → you execute.
- **tool_result**: tool_result goes in a USER message, with the SAME tool_use_id.
- **Structured output and tool_choice**: Schema-as-tool + tool_choice = JSON you can route on.
- **Agent patterns**: Simplest pattern that works. Agents: limit tools, cap loops, log, human approval.

## 12 · Claude on Amazon Bedrock

> ★ Bedrock = Claude through AWS: IAM auth, AWS billing, CloudTrail, PrivateLink.

| Command | What it does |
|---|---|
| `IAM + AWS bill + CloudTrail` | why Bedrock |
| `bedrock:InvokeModel(+WithResponseStream)` | least privilege |
| `Converse API` | one shape for all models |
| `VPC endpoint bedrock-runtime` | private access |
| `Guardrails · invocation logging` | governance |
| `CLAUDE_CODE_USE_BEDROCK=1 + AWS_REGION` | Claude Code |

**Memory hooks:**

- **Why Bedrock**: Same Claude, AWS identity, AWS bill, AWS audit.
- **Least-privilege IAM**: InvokeModel(+Stream) on specific ARNs. Roles and SSO, no stored keys.
- **Calling Claude on Bedrock**: InvokeModel (Messages format) or Converse (one shape for all models).
- **Private and governed**: PrivateLink · invocation logging · Guardrails · CloudTrail · budgets.
- **Claude Code on Bedrock**: CLAUDE_CODE_USE_BEDROCK=1 + AWS_REGION + AWS_PROFILE (SSO). No keys in files.

## 13 · Headless, GitHub Actions & the Agent SDK

> ★ claude -p for scripts · claude-code-action for GitHub · Agent SDK for your own agents.

| Command | What it does |
|---|---|
| `claude -p "…" --output-format json` | headless |
| `--allowedTools "Read,Bash(pytest:*)"` | pre-approve |
| `anthropics/claude-code-action@v1` | GitHub |
| `${{ secrets.ANTHROPIC_API_KEY }}` | no plain keys |
| `claude-agent-sdk` | Agent SDK |
| `sandbox + caps + logs` | unattended safety |

**Memory hooks:**

- **Headless mode**: claude -p "task" --output-format json --allowedTools "Read,Grep"
- **GitHub Actions**: claude-code-action@v1 + secrets.ANTHROPIC_API_KEY + minimal permissions.
- **In your automations**: Simple AI step → API. Repo/tool work → claude -p. Product agent → Agent SDK.
- **The Claude Agent SDK**: Agent SDK = Claude Code's engine for your own agents.
- **Guardrails for unattended runs**: Allowed tools only · sandbox · least-privilege creds · caps · logs · untrusted input.

## 14 · Capstone: A Secure Claude Code Setup

> ★ Memory · rules · hooks · skills · subagents · MCP · CI: defense in depth for an AI teammate.

| Command | What it does |
|---|---|
| `injection · secrets · destructive · supply chain · over-privilege` | agent risks |
| `deny secrets · ask infra changes` | rules |
| `PreToolUse hook exit 2` | guarantee |
| `read-only SSO profile` | credentials |
| `/security-review` | built-in review |
| `commit guardrails, secrets in env` | team & CI |

**Memory hooks:**

- **The risks**: Injection · secrets · destructive commands · supply chain · over-privileged creds.
- **Layered controls**: Deny secrets · ask for infra changes · hook guarantees · read-only creds · sandbox · review.
- **Claude as a security teammate**: /security-review · IaC & IAM review · threat models · runbooks. You verify.
- **Team and CI**: Commit the guardrails. Secrets in env/secrets. PR review on every change.
- **Ship it as a portfolio project**: Config + README of controls + screenshots + findings fixed.

