/* Claude Code Config Lab: a project's Claude Code files written as one YAML document
   (files: { path: | content }). The "doctor" validates each file (settings, CLAUDE.md,
   skills, subagents, .mcp.json, hook scripts, Messages API requests, GitHub workflows) and a
   simulator decides what happens when Claude tries tool calls: hooks first, then deny > ask >
   allow rules, then the permission mode. Nothing runs for real; it all happens in your browser. */
window.CC = (function () {
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const READ_ONLY = ['Read', 'Grep', 'Glob', 'LS', 'WebSearch', 'TodoWrite'];
  const EDIT_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];
  const KNOWN_TOOLS = ['Read', 'Edit', 'Write', 'MultiEdit', 'Bash', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'Task', 'Agent', 'NotebookEdit', 'TodoWrite', 'Skill'];
  const MODES = ['default', 'acceptEdits', 'plan', 'bypassPermissions'];
  const SECRET_RE = /(sk-ant-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|xox[bp]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY)/;

  function parseFrontmatter(text) {
    const m = String(text).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) return null;
    let fm; try { fm = YAML.parse(m[1]) || {}; } catch (e) { return { error: 'frontmatter YAML error: ' + e.message }; }
    return { fm: isObj(fm) ? fm : {}, body: m[2] };
  }
  const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '.').replace(/\u0000/g, '.*') + '$');
  const normPath = p => String(p || '').replace(/^\.\//, '').replace(/^\/+/, '');

  /* ---------- permission rules ---------- */
  function parseRule(r) {
    const m = String(r).match(/^\s*([A-Za-z_][\w-]*)\s*(?:\((.*)\))?\s*$/);
    if (!m) return { bad: true, raw: r };
    return { tool: m[1], spec: m[2], raw: r };
  }
  function ruleMatches(rule, call) {
    if (rule.bad) return false;
    if (rule.tool.startsWith('mcp__')) { if (call.tool === rule.tool) return true; return rule.tool.split('__').length === 2 && call.tool.startsWith(rule.tool + '__'); }
    if (rule.tool !== call.tool) return false;
    if (rule.spec == null || rule.spec === '' || rule.spec === '*') return true;
    const spec = rule.spec;
    if (call.tool === 'Bash') {
      const cmd = String(call.command || '').trim();
      if (spec.endsWith(':*')) return cmd === spec.slice(0, -2) || cmd.startsWith(spec.slice(0, -2) + ' ') || cmd.startsWith(spec.slice(0, -2));
      return globRe(spec.replace(/\*\*/g, '*').replace(/\*/g, '**')).test(cmd) || cmd === spec;
    }
    if (call.tool === 'WebFetch') {
      const d = spec.replace(/^domain:/, ''); let host = ''; try { host = new URL(call.url).hostname; } catch (e) {}
      return host === d || host.endsWith('.' + d);
    }
    if (['Read', 'Edit', 'Write', 'MultiEdit', 'Grep', 'Glob', 'NotebookEdit'].includes(call.tool)) {
      const p = normPath(call.path), s = normPath(spec.replace(/^~\//, ''));
      return globRe(s).test(p) || (s.endsWith('/**') && p.startsWith(s.slice(0, -3) + '/')) || p === s || globRe('**/' + s).test(p);
    }
    return true;
  }
  /* rules: Edit rules also cover Write/MultiEdit (as in Claude Code, file-editing tools share Edit rules) */
  function matchAny(list, call) {
    return list.find(r => ruleMatches(r, call) || (EDIT_TOOLS.includes(call.tool) && r.tool === 'Edit' && ruleMatches(Object.assign({}, r, { tool: call.tool }), call)));
  }

  /* ---------- hook scripts: bash grep patterns that exit 2 ---------- */
  function runHookScript(script, inputJson) {
    // supports the common pattern:  if echo "$input" | grep -qE 'REGEX'; then echo "msg" >&2; exit 2; fi
    const lines = String(script).split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/grep\s+-q?[iE]*q?[iE]*\s+(['"])(.+?)\1/);
      if (!m) continue;
      const flags = /-\w*i/.test(lines[i]) ? 'i' : '';
      let re; try { re = new RegExp(m[2].replace(/\\\\/g, '\\'), flags); } catch (e) { return { error: 'bad regex in hook: ' + m[2] }; }
      const block = lines.slice(i, i + 5).join('\n');
      const exit = (block.match(/exit\s+(\d+)/) || [])[1];
      const msg = (block.match(/echo\s+(['"])(.+?)\1\s*>&2/) || [])[2] || 'blocked by hook';
      const negate = /!\s*echo|if\s+!/.test(lines[i]);
      const hit = re.test(inputJson);
      if ((hit && !negate) || (!hit && negate)) { if (exit === '2') return { block: true, msg }; if (exit && exit !== '0') return { nonblocking: true, code: +exit, msg }; }
    }
    return { block: false };
  }

  function run(text, scenario) {
    const r = { ok: false, error: null, files: {}, problems: [], decisions: [], has: p => r.problems.some(x => x.id === p), clean: () => !r.problems.length };
    let doc;
    try { doc = YAML.parse(String(text)); } catch (e) { r.error = 'YAML error: ' + e.message; return r; }
    if (!isObj(doc) || !isObj(doc.files)) { r.error = 'Write the project as: files: then one entry per file path, each with | and its content'; return r; }
    r.files = doc.files; const F = doc.files;
    const prob = (file, id, msg, fix) => r.problems.push({ file, id, msg, fix });
    const json = (path) => { try { return JSON.parse(F[path]); } catch (e) { prob(path, 'json', `${path} is not valid JSON: ${e.message}`, 'Check commas, quotes and brackets (JSON has no comments or trailing commas).'); return null; } };

    /* ---- settings (user < project < local; arrays merge) ---- */
    const scopes = ['~/.claude/settings.json', '.claude/settings.json', '.claude/settings.local.json'];
    const merged = { allow: [], ask: [], deny: [], hooks: {}, defaultMode: 'default', env: {} };
    scopes.forEach(p => {
      if (F[p] == null) return; const s = json(p); if (!s) return;
      const perm = s.permissions || {};
      ['allow', 'ask', 'deny'].forEach(k => { if (perm[k] != null && !Array.isArray(perm[k])) prob(p, 'perm-array', `permissions.${k} must be a list`, `"${k}": ["Bash(npm run test:*)"]`); (perm[k] || []).forEach(x => { const pr = parseRule(x); if (pr.bad || (!KNOWN_TOOLS.includes(pr.tool) && !pr.tool.startsWith('mcp__'))) prob(p, 'bad-rule', `Unknown permission rule "${x}"`, 'Rules look like Tool or Tool(specifier): Bash(npm run test:*), Read(./.env), Edit(src/**), WebFetch(domain:docs.aws.amazon.com), mcp__github'); else merged[k].push(pr); }); });
      if (perm.defaultMode) { if (!MODES.includes(perm.defaultMode)) prob(p, 'bad-mode', `Unknown defaultMode "${perm.defaultMode}"`, 'Use default, acceptEdits, plan or bypassPermissions.'); else merged.defaultMode = perm.defaultMode; }
      if (s.defaultMode) prob(p, 'mode-place', 'defaultMode belongs inside "permissions"', '"permissions": { "defaultMode": "plan" }');
      if (isObj(s.env)) { Object.assign(merged.env, s.env); Object.entries(s.env).forEach(([k, v]) => { if (SECRET_RE.test(String(v)) && p !== '.claude/settings.local.json' && p !== '~/.claude/settings.json') prob(p, 'secret-in-settings', `A secret is committed in ${p} (env.${k})`, 'Keep secrets out of committed files: use your shell environment, settings.local.json or a secrets manager.'); }); }
      if (s.hooks != null) {
        if (!isObj(s.hooks)) prob(p, 'hooks-shape', '"hooks" must be an object keyed by event name', '"hooks": { "PreToolUse": [ { "matcher": "Edit|Write", "hooks": [ { "type": "command", "command": "…" } ] } ] }');
        else Object.entries(s.hooks).forEach(([ev, groups]) => {
          if (!['PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Stop', 'SubagentStop', 'SessionStart', 'SessionEnd', 'Notification', 'PreCompact', 'PermissionRequest', 'PostToolUseFailure'].includes(ev)) prob(p, 'hook-event', `Unknown hook event "${ev}"`, 'Common events: PreToolUse, PostToolUse, UserPromptSubmit, Stop, SessionStart, Notification.');
          if (!Array.isArray(groups)) { prob(p, 'hooks-shape', `hooks.${ev} must be a list of matcher groups`, '[ { "matcher": "Bash", "hooks": [ … ] } ]'); return; }
          groups.forEach(g => { if (!isObj(g) || !Array.isArray(g.hooks)) { prob(p, 'hooks-shape', `each ${ev} entry needs "hooks": [ … ]`, '{ "matcher": "Edit|Write", "hooks": [ { "type": "command", "command": "…" } ] }'); return; }
            g.hooks.forEach(h => { if (h.type !== 'command' && h.type !== 'prompt') prob(p, 'hook-type', `hook type must be "command" (or "prompt")`, '"type": "command"'); if (h.type === 'command' && !h.command) prob(p, 'hook-cmd', 'command hook needs "command"', '"command": "$CLAUDE_PROJECT_DIR/.claude/hooks/protect.sh"'); });
            (merged.hooks[ev] = merged.hooks[ev] || []).push(g); });
        });
      }
    });
    r.settings = merged;

    /* ---- CLAUDE.md ---- */
    if (F['CLAUDE.md'] != null) {
      const md = String(F['CLAUDE.md']); const lines = md.split('\n').length;
      r.claudeMd = { lines, text: md, imports: (md.match(/(^|\s)@[\w./~-]+/g) || []).map(s => s.trim().slice(1)) };
      if (lines > 200) prob('CLAUDE.md', 'claudemd-long', `CLAUDE.md is ${lines} lines: it's loaded into every session`, 'Keep it short and specific; move details into imported files (@docs/…) or skills.');
      if (SECRET_RE.test(md)) prob('CLAUDE.md', 'secret-in-claudemd', 'CLAUDE.md contains a secret', 'Never put keys in CLAUDE.md: it is committed and sent to the model.');
      r.claudeMd.imports.forEach(i => { if (F[i] == null && F[i.replace(/^\.\//, '')] == null) prob('CLAUDE.md', 'missing-import', `CLAUDE.md imports @${i}, but that file isn't in the project`, `Add ${i} under files: or fix the path.`); });
    }

    /* ---- skills & commands ---- */
    Object.keys(F).filter(p => /^\.claude\/skills\//.test(p)).forEach(p => {
      const m = p.match(/^\.claude\/skills\/([^/]+)\/(.+)$/); if (!m) { prob(p, 'skill-path', 'Skills live in .claude/skills/<skill-name>/SKILL.md', 'Create a folder per skill with a SKILL.md inside.'); return; }
      if (m[2] !== 'SKILL.md') return;
      const f = parseFrontmatter(F[p]); if (!f || f.error) { prob(p, 'skill-frontmatter', f && f.error || 'SKILL.md must start with YAML frontmatter between --- lines', '---\nname: my-skill\ndescription: What it does and when to use it\n---'); return; }
      if (!f.fm.name) prob(p, 'skill-name', 'SKILL.md frontmatter needs name', 'name: ' + m[1]);
      else if (!/^[a-z0-9-]{1,64}$/.test(f.fm.name)) prob(p, 'skill-name', `Skill name "${f.fm.name}" must be lowercase letters, numbers and hyphens`, 'name: ' + String(f.fm.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      if (!f.fm.description) prob(p, 'skill-desc', 'SKILL.md frontmatter needs description (Claude uses it to decide when to load the skill)', 'description: Checks … Use when …');
      else if (String(f.fm.description).length < 30) prob(p, 'skill-desc', 'The skill description is too vague for Claude to know when to use it', 'Say what it does AND when to use it.');
      if (!f.body.trim()) prob(p, 'skill-body', 'SKILL.md has no instructions after the frontmatter', 'Add the steps Claude should follow.');
      (r.skills = r.skills || []).push(Object.assign({ path: p, folder: m[1] }, f.fm));
    });
    /* ---- subagents ---- */
    Object.keys(F).filter(p => /^\.claude\/agents\/.+\.md$/.test(p)).forEach(p => {
      const f = parseFrontmatter(F[p]); if (!f || f.error) { prob(p, 'agent-frontmatter', f && f.error || 'Subagent files start with frontmatter (name, description, optional tools and model)', '---\nname: security-reviewer\ndescription: …\ntools: Read, Grep, Glob\n---'); return; }
      if (!f.fm.name || !/^[a-z0-9-]+$/.test(f.fm.name)) prob(p, 'agent-name', 'Subagent needs a lowercase-hyphen name', 'name: security-reviewer');
      if (!f.fm.description || String(f.fm.description).length < 30) prob(p, 'agent-desc', 'Subagent needs a clear description (Claude uses it to decide when to delegate)', 'description: Reviews … Use proactively after …');
      const tools = f.fm.tools == null ? null : String(f.fm.tools).split(',').map(s => s.trim()).filter(Boolean);
      (tools || []).forEach(t => { if (!KNOWN_TOOLS.includes(t) && !t.startsWith('mcp__')) prob(p, 'agent-tools', `Unknown tool "${t}" in tools`, 'Tools: Read, Grep, Glob, Edit, Write, Bash, WebFetch, WebSearch …'); });
      if (f.fm.model && !['sonnet', 'opus', 'haiku', 'inherit'].includes(f.fm.model) && !/^claude-/.test(f.fm.model)) prob(p, 'agent-model', `Unknown model "${f.fm.model}"`, 'model: sonnet | opus | haiku | inherit');
      if (!f.body.trim()) prob(p, 'agent-body', 'The subagent has no system prompt after the frontmatter', 'Describe its role, steps and output format.');
      (r.agents = r.agents || []).push(Object.assign({ path: p, toolList: tools }, f.fm));
    });
    /* ---- MCP ---- */
    if (F['.mcp.json'] != null) {
      const m = json('.mcp.json');
      if (m) {
        if (!isObj(m.mcpServers)) prob('.mcp.json', 'mcp-shape', '.mcp.json needs a top-level "mcpServers" object', '{ "mcpServers": { "github": { "type": "http", "url": "…" } } }');
        else Object.entries(m.mcpServers).forEach(([n, s]) => {
          if (!isObj(s)) return prob('.mcp.json', 'mcp-shape', `server "${n}" must be an object`, '');
          const remote = s.type === 'http' || s.type === 'sse' || s.url;
          if (remote && !s.url) prob('.mcp.json', 'mcp-url', `remote server "${n}" needs a url`, '"url": "https://…/mcp"');
          if (!remote && !s.command) prob('.mcp.json', 'mcp-command', `local (stdio) server "${n}" needs a command`, '"command": "npx", "args": ["-y", "…"]');
          const blob = JSON.stringify(s);
          if (SECRET_RE.test(blob)) prob('.mcp.json', 'mcp-secret', `server "${n}" has a secret written in .mcp.json (it's committed)`, 'Use environment variable expansion: "Authorization": "Bearer ${GITHUB_TOKEN}"');
          (r.mcp = r.mcp || []).push(Object.assign({ name: n }, s));
        });
      }
    }
    /* ---- MCP tool definitions & Messages API requests ---- */
    Object.keys(F).filter(p => /^api\/.+\.json$/.test(p) || /^mcp\/.+\.json$/.test(p)).forEach(p => {
      const j = json(p); if (!j) return;
      if (/^mcp\//.test(p)) { const tools = Array.isArray(j) ? j : j.tools; (tools || []).forEach(t => checkTool(p, t, 'inputSchema')); r.mcpTools = tools; return; }
      checkRequest(p, j); (r.requests = r.requests || {})[p] = j;
    });
    function checkTool(p, t, key) {
      if (!t || !t.name || !/^[a-zA-Z0-9_-]{1,64}$/.test(t.name)) prob(p, 'tool-name', `tool name "${t && t.name}" must be letters, numbers, _ or -`, '"name": "get_invoice_status"');
      if (!t || !t.description || String(t.description).length < 20) prob(p, 'tool-desc', `tool "${t && t.name}" needs a detailed description (the model chooses tools by reading it)`, '"description": "Returns the status of an invoice by its ID. Use when …"');
      const sc = t && t[key];
      if (!isObj(sc) || sc.type !== 'object' || !isObj(sc.properties)) prob(p, 'tool-schema', `tool "${t && t.name}" needs ${key}: a JSON Schema with type "object" and properties`, `"${key}": { "type": "object", "properties": { "invoice_id": { "type": "string" } }, "required": ["invoice_id"] }`);
      else (sc.required || []).forEach(q => { if (!sc.properties[q]) prob(p, 'tool-required', `tool "${t.name}" requires "${q}" but doesn't define it in properties`, ''); });
    }
    function checkRequest(p, j) {
      if (!j.model) prob(p, 'api-model', 'request needs "model"', '"model": "claude-sonnet-5-5"');
      if (!j.max_tokens || typeof j.max_tokens !== 'number') prob(p, 'api-max-tokens', 'request needs "max_tokens" (a number)', '"max_tokens": 1024');
      if (!Array.isArray(j.messages) || !j.messages.length) { prob(p, 'api-messages', 'request needs a non-empty "messages" list', '"messages": [ { "role": "user", "content": "…" } ]'); return; }
      if (j.messages.some(m => m.role === 'system')) prob(p, 'api-system-role', '"system" is not a message role in the Messages API', 'Move it to the top-level "system" field.');
      if (j.messages[0].role !== 'user') prob(p, 'api-first-user', 'the first message must have role "user"', '');
      for (let i = 1; i < j.messages.length; i++) if (j.messages[i].role === j.messages[i - 1].role && j.messages[i].role !== 'system') { prob(p, 'api-alternate', 'messages must alternate user / assistant', ''); break; }
      if (SECRET_RE.test(JSON.stringify(j))) prob(p, 'api-secret', 'an API key is inside the request body', 'Send the key in the x-api-key header from an environment variable, never in code or JSON files.');
      (j.tools || []).forEach(t => checkTool(p, t, 'input_schema'));
      // tool_use / tool_result pairing
      const uses = {}; j.messages.forEach((m, i) => { (Array.isArray(m.content) ? m.content : []).forEach(b => {
        if (b.type === 'tool_use') uses[b.id] = { i, name: b.name };
        if (b.type === 'tool_result') { if (m.role !== 'user') prob(p, 'api-tool-result-role', 'tool_result blocks go in a "user" message', ''); if (!uses[b.tool_use_id]) prob(p, 'api-tool-result-id', `tool_result.tool_use_id "${b.tool_use_id}" doesn't match any earlier tool_use id`, 'Copy the id from the assistant\'s tool_use block.'); }
      }); });
      if (j.tool_choice && j.tool_choice.type === 'tool' && !(j.tools || []).some(t => t.name === j.tool_choice.name)) prob(p, 'api-tool-choice', `tool_choice names "${j.tool_choice.name}" which isn't in tools`, '');
    }
    /* ---- IAM policies (for Bedrock lessons) ---- */
    Object.keys(F).filter(p => /^iam\/.+\.json$/.test(p)).forEach(p => {
      const j = json(p); if (!j) return; (r.iam = r.iam || {})[p] = j;
      (j.Statement || []).forEach(s => { const acts = [].concat(s.Action || []), res = [].concat(s.Resource || []);
        if (s.Effect === 'Allow' && acts.some(a => a === '*' || a === 'bedrock:*')) prob(p, 'iam-wildcard-action', 'Allow with "*" or "bedrock:*" actions is far more than invoking a model', '"Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]');
        if (s.Effect === 'Allow' && res.includes('*')) prob(p, 'iam-wildcard-resource', 'Resource "*" lets the role invoke every model in the account', 'Scope Resource to the model / inference profile ARNs you use.'); });
    });
    /* ---- GitHub workflows ---- */
    Object.keys(F).filter(p => /^\.github\/workflows\/.+\.ya?ml$/.test(p)).forEach(p => {
      let w; try { w = YAML.parse(F[p]); } catch (e) { prob(p, 'gha-yaml', 'workflow YAML error: ' + e.message, ''); return; }
      (r.workflows = r.workflows || {})[p] = w;
      const steps = [].concat(...Object.values((w && w.jobs) || {}).map(j => j.steps || []));
      const step = steps.find(s => /anthropics\/claude-code-action/.test(s.uses || ''));
      if (!step) prob(p, 'gha-action', 'no step uses anthropics/claude-code-action', 'uses: anthropics/claude-code-action@v1');
      else { const k = ((step.with || {}).anthropic_api_key || ''); if (!/\$\{\{\s*secrets\.\w+\s*\}\}/.test(k) && !(step.with || {}).use_bedrock) prob(p, 'gha-secret', 'the API key must come from a repository secret', 'anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}'); }
      if (SECRET_RE.test(F[p])) prob(p, 'gha-plain-secret', 'a secret is written directly in the workflow file', 'Use ${{ secrets.NAME }}.');
      if (!w || !w.permissions) prob(p, 'gha-permissions', 'set explicit, minimal permissions for the job token', 'permissions:\n  contents: read\n  pull-requests: write');
    });

    /* ---- simulate tool calls ---- */
    const mode = (scenario && scenario.mode) || merged.defaultMode;
    ((scenario && scenario.calls) || []).forEach(c => r.decisions.push(Object.assign({ call: c }, decide(c, merged, mode, F))));
    r.mode = mode; r.ok = true;
    return r;
  }

  function decide(call, S, mode, F) {
    // compound shell commands: every part must pass; the strictest decision wins
    if (call.tool === 'Bash' && /&&|\|\||;|\|/.test(call.command || '') && !call._part) {
      const parts = String(call.command).split(/&&|\|\||;|\|/).map(x => x.trim()).filter(Boolean);
      const rank = { error: 0, blocked: 0, denied: 1, ask: 2, allowed: 3 };
      const hook = decideOne(call, S, mode, F); if (hook.by === 'hook' || hook.decision === 'error') return hook;
      let worst = null;
      parts.forEach(c => { const d = decideOne({ tool: 'Bash', command: c, _part: true }, S, mode, F); if (!worst || rank[d.decision] < rank[worst.decision]) worst = Object.assign({}, d, { why: `"${c}": ${d.why} (each part of a chained command is checked)` }); });
      return worst;
    }
    return decideOne(call, S, mode, F);
  }
  function decideOne(call, S, mode, F) {
    const input = JSON.stringify({ tool_name: call.tool, tool_input: { command: call.command, file_path: call.path, url: call.url } });
    // 1. PreToolUse hooks
    for (const g of (S.hooks.PreToolUse || [])) {
      let re; try { re = new RegExp('^(?:' + (g.matcher || '.*') + ')$'); } catch (e) { re = /^$/; }
      if (g.matcher && !re.test(call.tool)) continue;
      for (const h of g.hooks || []) {
        if (h.type !== 'command') continue;
        const file = Object.keys(F).find(p => h.command.includes(p.replace(/^\.\//, '')) || h.command.endsWith('/' + p.split('/').pop()));
        if (!file) return { decision: 'error', why: `hook command "${h.command}" points to a script that isn't in the project` };
        const out = runHookScript(F[file], input);
        if (out.error) return { decision: 'error', why: out.error };
        if (out.block) return { decision: 'blocked', why: `PreToolUse hook ${file.split('/').pop()}: ${out.msg}`, by: 'hook' };
      }
    }
    // 2. rules: deny > ask > allow
    const d = matchAny(S.deny, call); if (d) return { decision: 'denied', why: `deny rule ${d.raw}`, by: 'deny' };
    const a = matchAny(S.ask, call); if (a) return { decision: 'ask', why: `ask rule ${a.raw}`, by: 'ask' };
    if (mode === 'plan' && !READ_ONLY.includes(call.tool)) return { decision: 'denied', why: 'plan mode is read-only: Claude can explore and plan but not edit or run commands', by: 'mode' };
    const al = matchAny(S.allow, call); if (al) return { decision: 'allowed', why: `allow rule ${al.raw}`, by: 'allow' };
    // 3. mode defaults
    if (READ_ONLY.includes(call.tool)) return { decision: 'allowed', why: 'read-only tools don\'t need permission', by: 'default' };
    if (mode === 'bypassPermissions') return { decision: 'allowed', why: 'bypassPermissions mode skips prompts (dangerous outside a sandbox)', by: 'mode' };
    if (mode === 'acceptEdits' && EDIT_TOOLS.includes(call.tool)) return { decision: 'allowed', why: 'acceptEdits mode auto-approves file edits', by: 'mode' };
    return { decision: 'ask', why: 'no rule matched: Claude asks you first (default)', by: 'default' };
  }

  return { run, decide, parseFrontmatter };
})();

window.LAB = (function () {
  const DEFAULT = `files:
  CLAUDE.md: |
    # raul-shop
    FastAPI + Supabase invoice API.
    ## Commands
    - npm run test
  .claude/settings.json: |
    {
      "permissions": {
        "allow": ["Bash(npm run test:*)"],
        "deny": ["Read(./.env)"]
      }
    }
`;
  const ICON = { allowed: ['✓ ALLOWED', 'ok'], ask: ['? ASKS YOU', 'skip'], denied: ['✕ DENIED', 'bad'], blocked: ['⛔ BLOCKED', 'bad'], error: ['! ERROR', 'bad'] };
  const label = c => c.tool + (c.command ? `(${c.command})` : c.path ? `(${c.path})` : c.url ? `(${c.url})` : '');
  function render(body, l, api) {
    const ch = l.challenge || {}; const esc = api.esc;
    const saved = api.drafts[l.id]; const text = saved != null ? saved : (ch.starter != null ? ch.starter : DEFAULT);
    const sc = ch.scenario || { calls: [{ tool: 'Bash', command: 'npm run test' }, { tool: 'Read', path: '.env' }, { tool: 'Edit', path: 'src/app.py' }, { tool: 'Bash', command: 'git push origin main' }] };
    body.innerHTML = `<div class="lab cfn"><div class="col"><div class="lh">PROJECT FILES <span>YAML · files: path: | content</span></div><textarea id="labText" spellcheck="false">${esc(text)}</textarea></div>
      <div class="col"><div class="lh">CLAUDE CODE DOCTOR</div>
        <div class="btnrow"><button class="btn" id="runBtn">▶ CHECK & SIMULATE</button><button class="btn ghost" id="resetBtn">RESET</button><button class="btn ghost" id="refBtn">CHEATSHEET</button></div>
        <div id="labOut" class="labout"><span class="cm">CHECK validates every file like Claude Code would load it, then simulates what happens when Claude tries the actions below${sc.mode ? ' in ' + esc(sc.mode) + ' mode' : ''}: hooks first, then deny → ask → allow rules, then the permission mode.</span>${sc.calls.map(c => `<div class="tr skip">→ ${esc(label(c))}</div>`).join('')}</div></div></div>` + api.taskBar(l);
    const ta = body.querySelector('#labText');
    ta.oninput = () => api.drafts[l.id] = ta.value;
    ta.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = p + 2; api.drafts[l.id] = ta.value; }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); body.querySelector('#runBtn').click(); }
      else if (e.key === 'Enter') { const p = ta.selectionStart; const line = ta.value.slice(0, p).split('\n').pop(); const ind = (line.match(/^\s*/) || [''])[0] + (/:\s*\|?\s*$/.test(line) ? '  ' : ''); e.preventDefault(); ta.value = ta.value.slice(0, p) + '\n' + ind + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = p + 1 + ind.length; api.drafts[l.id] = ta.value; }
      e.stopPropagation(); };
    const out = body.querySelector('#labOut');
    body.querySelector('#refBtn').onclick = () => {
      const R = [['Format', 'files:\n  path/to/file: |\n    content (indented 4 spaces)'], ['Settings scopes', '~/.claude/settings.json (you) · .claude/settings.json (team, committed) · .claude/settings.local.json (you, not committed)'], ['Permission rules', 'Bash(npm run test:*) · Bash(git push *) · Read(./.env) · Edit(src/**) · WebFetch(domain:docs.aws.amazon.com) · mcp__github'], ['Order', 'PreToolUse hooks → deny → ask → plan mode → allow → mode default'], ['Modes', 'default · acceptEdits · plan · bypassPermissions  ("permissions": { "defaultMode": "plan" })'], ['Hook script', 'if echo "$input" | grep -qE \'REGEX\'; then echo "msg" >&2; exit 2; fi   (exit 2 blocks, exit 1 does not)'], ['Skill', '.claude/skills/<name>/SKILL.md with ---\\nname:\\ndescription:\\n---'], ['Subagent', '.claude/agents/<name>.md with name, description, tools, model'], ['MCP', '.mcp.json → { "mcpServers": { name: { "command", "args" } | { "type": "http", "url" } } }'], ['API request', 'api/*.json → model, max_tokens, system, messages (user/assistant), tools'], ['GitHub Action', '.github/workflows/*.yml → uses: anthropics/claude-code-action@v1, secrets, permissions']];
      out.innerHTML = R.map(([a, b]) => `<div class="tr skip"><b>${esc(a)}</b> · <code style="white-space:pre-wrap">${esc(b)}</code></div>`).join('');
    };
    body.querySelector('#runBtn').onclick = () => {
      const r = CC.run(ta.value, sc);
      let h;
      if (!r.ok) h = `<div class="dec err">✕ ${esc(r.error)}</div>`;
      else {
        h = `<div class="dec ${r.problems.length ? 'deny' : 'allow'}">${r.problems.length ? '✕ ' + r.problems.length + ' problem(s)' : '✓ All files look good'} · ${Object.keys(r.files).length} file(s) · mode: ${esc(r.mode)}</div>`;
        if (r.problems.length) h += `<div class="lh" style="margin:6px 0 2px">DOCTOR</div>` + r.problems.map(p => `<div class="tr bad"><b>${esc(p.file)}</b> [${esc(p.id)}] ${esc(p.msg)}${p.fix ? `<br><i>→ ${esc(p.fix)}</i>` : ''}</div>`).join('');
        if (r.decisions.length) h += `<div class="lh" style="margin:6px 0 2px">SIMULATED TOOL CALLS</div>` + r.decisions.map(d => `<div class="tr ${ICON[d.decision][1]}"><b>${ICON[d.decision][0]}</b> ${esc(label(d.call))} <span class="cm">${esc(d.why)}</span></div>`).join('');
      }
      let checkMsg = '';
      if (ch.check) { let res; try { res = ch.check(r); } catch (e) { res = 'check error: ' + e.message; }
        if (res === true) { api.solve(l.id); checkMsg = `<div class="dec allow" style="margin-top:6px">✓ Challenge requirements met</div>`; }
        else checkMsg = `<div class="dec imp" style="margin-top:6px">Challenge: ${esc(typeof res === 'string' ? res : 'not met yet')}</div>`; }
      out.innerHTML = h + checkMsg;
    };
    body.querySelector('#resetBtn').onclick = () => { api.drafts[l.id] = null; render(body, l, api); };
  }
  return { render };
})();
