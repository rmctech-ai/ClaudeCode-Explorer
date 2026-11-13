window.COURSE = {
 "short": "CC",
 "key": "claudecode-explorer-v1",
 "prompt": "$",
 "termTitle": "terminal",
 "where": "SHELL",
 "lab": "cc",
 "handsOn": "Config Lab challenge",
 "errRe": "^Error|^error|\\bdenied\\b|hook error|^4\\d\\d\\b|invalid_request|AI assistant:",
 "cats": [
  [
   "all",
   "ALL"
  ],
  [
   "cc",
   "CLAUDE CODE"
  ],
  [
   "mcp",
   "MCP"
  ],
  [
   "api",
   "CLAUDE API"
  ],
  [
   "aws",
   "AWS & AUTOMATION"
  ]
 ],
 "catTitle": {
  "cc": "CLAUDE CODE (101 · IN ACTION · SUBAGENTS · SKILLS)",
  "mcp": "MODEL CONTEXT PROTOCOL",
  "api": "BUILDING WITH THE CLAUDE API",
  "aws": "CLAUDE ON AWS, AUTOMATION & SECURITY"
 },
 "kinds": {
  "sh": [
   "SHELL",
   "#0d9488"
  ],
  "cc": [
   "CLAUDE CODE",
   "#d97757"
  ],
  "json": [
   "CONFIG",
   "#7c3aed"
  ],
  "api": [
   "API",
   "#1d5bd8"
  ],
  "err": [
   "BLOCKED",
   "#e11d48"
  ]
 },
 "layers": [
  "AGENT LOOP",
  "CONTEXT",
  "CONTROL",
  "EXTEND",
  "PROTOCOL",
  "API",
  "PRODUCTION"
 ],
 "levels": [
  [
   0,
   "AUTOCOMPLETE USER"
  ],
  [
   150,
   "PROMPTER"
  ],
  [
   400,
   "PAIR PROGRAMMER"
  ],
  [
   800,
   "CONFIG WRANGLER"
  ],
  [
   1300,
   "AGENT BUILDER"
  ],
  [
   2000,
   "AI ENGINEER"
  ],
  [
   2900,
   "CLAUDE ARCHITECT"
  ]
 ]
};
COURSE.errRe = new RegExp(COURSE.errRe, "i");
