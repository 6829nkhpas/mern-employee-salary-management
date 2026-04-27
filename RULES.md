# Rules

1. **GIT DISCIPLINE.** Commits must be executed only in the exact sequence requested by the human. No squashing. No auto-committing without explicit human command.
2. **NO VIBE CODING.** Do not hallucinate file paths or components. Check the directory tree first. If a file or component does not exist, state that clearly.
3. **DATA VALIDATION.** All future monetary fields cannot be negative. All dates must render as `DD/MM/YYYY` on the frontend.
4. **DATABASE EFFICIENCY.** Never fetch entire tables to the Node server for mathematical aggregations. Always use raw MySQL queries for sums, grouped totals, and limits.
