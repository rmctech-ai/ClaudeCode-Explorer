window.EXPLAIN = {
"what-is-cc": [
 ["Claude Code runs an agentic loop over your project: it gathers context, edits files, runs commands and verifies the results.", ["It does far more than suggest the next characters.", null, "It reads and edits files in your project.", "Formatting is one small thing it can do."]],
 ["Read-only tools like Read, Grep and Glob run without prompts; tools that change things ask unless allowed.", ["Bash and Edit ask by default.", null, "Changing tools ask first.", "Read-only tools are allowed."]],
 ["A way to verify (tests, linters, screenshots) lets Claude see its mistakes and fix them in the loop.", ["Longer prompts don't replace feedback from tests.", null, "Time of day doesn't matter.", "Disabling permissions removes safety, not mistakes."]],
 ["/rewind restores code and conversation to an earlier checkpoint.", [null, "Deleting the repo destroys your work.", "/init creates CLAUDE.md.", "/mcp manages MCP servers."]]
],
"claude-md": [
 ["CLAUDE.md is project memory, loaded at the start of every session.", ["README.md is for humans; Claude reads it only if asked.", null, ".env holds secrets and should be denied.", "package.json isn't loaded as memory."]],
 ["/clear gives a fresh context so the old task doesn't confuse the new one or waste tokens.", [null, "Old context makes answers worse and costs tokens.", "/init regenerates CLAUDE.md, not context.", "A restart isn't needed."]],
 ["@path imports keep the main CLAUDE.md short while making details available.", ["Pasting everything bloats every session.", null, ".env is for secrets.", "Imports exist for this."]],
 ["CLAUDE.md is committed and sent to the model, so secrets must never go in it.", ["Test commands are ideal content.", "Conventions are ideal content.", null, "Architecture notes are useful content."]]
],
"workflow": [
 ["Shift+Tab cycles permission modes, including plan mode.", [null, "/compact summarizes context.", "/mcp manages servers.", "Ctrl+C interrupts or exits."]],
 ["Plan mode is read-only: Claude can read and research but not edit or run changing commands.", ["That's the opposite of plan mode.", null, "It plans in full detail.", "Pushing is a change; it's not allowed."]],
 ["Name the file, the behavior, the constraint and how to verify it.", ["Too vague to act on well.", null, "Vague; Claude must guess what better means.", "Unscoped requests produce sprawling changes."]],
 ["Review terraform plan output before any apply; infrastructure changes are hard to undo.", ["Applying blindly risks outages and data loss.", null, "Git is unrelated to applying.", "Deleting state breaks Terraform."]]
],
"permissions": [
 ["Deny rules always take precedence over allow rules.", ["Deny wins over allow.", null, "A deny rule doesn't ask.", "It's a valid configuration."]],
 ["settings.local.json is for personal, non-committed settings in one repo.", ["settings.json is shared with the team.", null, "CLAUDE.md is memory, not settings.", ".env holds secrets."]],
 ["Bash(npm run test:*) matches commands starting with npm run test.", ["A bare Bash rule allows every command.", null, "Edit rules are for files.", "Read rules are for files."]],
 ["Bypass mode removes prompts, so use it only in an isolated sandbox without secrets.", ["Admin credentials plus no prompts is the worst case.", null, "Never by default.", "Production needs review, not bypass."]]
],
"hooks": [
 ["Exit code 2 blocks a PreToolUse action and returns stderr to Claude.", ["0 means continue.", "1 is a non-blocking error; the action still runs.", null, "Only 2 blocks."]],
 ["PostToolUse with matcher Edit|Write runs after every successful file edit.", [null, "SessionStart runs once per session.", "Notification is for alerts.", "UserPromptSubmit runs on your prompts."]],
 ["Hooks receive JSON on stdin including tool_name and tool_input.", [null, "CLAUDE.md isn't hook input.", "Environment variables carry only some context.", "They receive the full payload on stdin."]],
 ["Hooks are deterministic code that runs every time; instructions can be missed or overridden.", [null, "CLAUDE.md is read, but instructions aren't guarantees.", "Token cost isn't the main reason.", "There's a big difference: enforcement."]]
],
"skills": [
 ["At startup Claude loads only each skill's name and description (progressive disclosure).", ["The full folder loads only when needed.", null, "Descriptions load at startup so Claude can choose skills.", "Scripts run only when the steps call for them."]],
 ["Claude uses the description to decide when to load the skill, so it must say what and when.", ["Length isn't the point.", null, "Emojis don't help selection.", "The author doesn't affect selection."]],
 ["Project skills live in .claude/skills/(skill-name)/SKILL.md.", [null, "CLAUDE.md is memory.", ".mcp.json configures MCP servers.", "settings.json holds settings."]],
 ["Plugins bundle skills, subagents, hooks, slash commands and MCP servers.", ["Plugins can hold many components.", null, "They're not just themes.", "Plugins should never contain secrets."]]
],
"subagents": [
 ["The subagent reads in its own context window and returns only a summary to your main session.", ["Subagents still use tokens.", null, "Speed isn't the main benefit.", "Permission rules still apply."]],
 ["A reviewer only needs to read: Read, Grep and Glob.", ["All tools violates least privilege.", null, "Bash alone can't search files safely.", "Editing isn't a reviewer's job."]],
 ["Claude delegates when the task matches a subagent's description.", ["File size is irrelevant.", null, "Order doesn't matter.", "The model isn't how Claude chooses."]],
 ["MCP servers add tools that connect to external systems such as GitHub or AWS.", ["Skills add knowledge and steps, not external connections.", null, "CLAUDE.md is memory.", "Permission rules restrict tools; they don't add them."]]
],
"mcp-basics": [
 ["Tools are model-controlled actions the model decides to call.", ["Resources are app-controlled data.", null, "Prompts are user-chosen templates.", "Transports carry messages; they aren't primitives."]],
 ["Remote MCP servers use Streamable HTTP.", ["stdio is for local processes.", null, "FTP isn't an MCP transport.", "SMTP is email."]],
 [".mcp.json at the project root holds project-scoped servers shared via git.", [null, "CLAUDE.md is memory.", "Shell config isn't how MCP servers are shared.", ".env holds secrets."]],
 ["Use ${GITHUB_TOKEN} expansion so the token stays in your environment.", ["Plain-text tokens get committed and leaked.", null, "Names aren't for secrets.", "CLAUDE.md is committed too."]]
],
"mcp-build": [
 ["FastMCP uses the function's docstring as the tool description.", ["The file name isn't used.", null, "Return values are results, not descriptions.", "Only the docstring is used."]],
 ["MCP tool inputs are described with JSON Schema.", ["YAML isn't the schema format.", null, "SQL isn't used.", "Markdown isn't a schema."]],
 ["The MCP Inspector lets you list and call a server's tools by hand.", [null, "CloudWatch is AWS monitoring.", "Postman isn't MCP-aware by default.", "git bisect finds regressions."]],
 ["Sampling lets a server request a completion from the client's model.", ["It isn't random testing.", null, "It isn't logging.", "It isn't compression."]]
],
"messages-api": [
 ["The system prompt is a top-level system parameter, not a message role.", ["There is no system role in messages.", null, "The URL doesn't carry prompts.", "max_tokens is a number."]],
 ["max_tokens means the response hit the token limit and was cut off.", ["Natural completion is end_turn.", null, "A tool request is tool_use.", "Auth errors return 401, not a stop_reason."]],
 ["model, max_tokens and messages are required.", ["temperature is optional.", null, "tools are optional.", "stream is optional."]],
 ["Prompt caching bills cached input at a fraction of the normal price.", ["Sending it twice doubles cost.", null, "Bigger models cost more.", "Streaming doesn't change input cost."]]
],
"tool-use": [
 ["Your application executes client tools and returns the results.", ["Claude only requests the call.", null, "The browser isn't involved.", "Someone must run it, and that's your code."]],
 ["tool_result goes in a user message and references the same tool_use_id.", ["Assistant messages contain tool_use, not results.", null, "The system prompt is unrelated.", "A new id breaks the link."]],
 ["A forced schema tool (or structured outputs) yields predictable JSON.", ["Asking nicely isn't reliable.", null, "Temperature makes output less predictable.", "max_tokens is required."]],
 ["tool_use means Claude wants you to run a tool and send back the result.", ["Completion is end_turn.", null, "Rate limits return 429.", "Context limits return errors."]]
],
"bedrock": [
 ["InvokeModel and InvokeModelWithResponseStream on specific ARNs is least privilege.", ["bedrock:* on * is far too broad.", null, "S3 access isn't needed to invoke models.", "PassRole is unrelated."]],
 ["The Converse API gives one request shape across Bedrock models.", [null, "S3 Select queries S3 objects.", "Step Functions orchestrates workflows.", "EventBridge routes events."]],
 ["An interface VPC endpoint (PrivateLink) for bedrock-runtime keeps traffic private.", ["A NAT gateway sends traffic out to the internet.", null, "Public IPs defeat the purpose.", "CloudFront is a CDN."]],
 ["Set CLAUDE_CODE_USE_BEDROCK=1 and AWS_REGION, then use your normal AWS credentials (SSO profile).", ["Keys in CLAUDE.md would be committed.", null, "No plugin is needed.", "/mcp manages MCP servers."]]
],
"automation": [
 ["-p runs a single prompt non-interactively and prints the result.", [null, "There's no --chat flag for this.", "There's no GUI flag.", "--watch isn't the headless flag."]],
 ["Use a repository secret: ${{ secrets.ANTHROPIC_API_KEY }}.", ["Plain text leaks the key.", null, "CLAUDE.md is committed.", "PR comments are public."]],
 ["The Agent SDK embeds Claude Code's agent loop in your own software.", [null, "CLAUDE.md is memory, not a runtime.", "Sticky notes don't run code.", "/init creates CLAUDE.md."]],
 ["Pre-approve exactly the tools a job needs with --allowedTools.", ["Skipping permissions unattended is dangerous.", null, "Admin keys maximize damage.", "Logs are essential for unattended runs."]]
],
"secure-capstone": [
 ["Hidden instructions inside content Claude reads are prompt injection.", ["Hooks are your controls, not attacks.", null, "Skills are instructions you install deliberately.", "Hidden commands to leak credentials are an attack."]],
 ["Deny rules and PreToolUse hooks are enforced by code every time.", ["Instructions can be overridden by injection.", null, "Asking isn't enforcement.", "Model size doesn't enforce anything."]],
 ["A read-only SSO profile limits what any mistake or injection can do.", ["Admin keys maximize the blast radius.", null, "Root should never be used.", "Skipping permissions removes every safeguard."]],
 ["/security-review checks your pending changes for security issues.", [null, "/init creates CLAUDE.md.", "/compact summarizes context.", "/cost reports spend."]]
]
};

/* merge into the lessons (loaded after lessons, before app.js) */
(function (E) { (window.LESSONS || []).forEach(l => { const x = E[l.id]; if (!x || !l.quiz) return; x.forEach((e, i) => { const q = l.quiz[i]; if (!q || !e) return; if (e[0]) q.why = e[0]; if (e[1]) q.w = e[1]; }); }); })(window.EXPLAIN || {});
