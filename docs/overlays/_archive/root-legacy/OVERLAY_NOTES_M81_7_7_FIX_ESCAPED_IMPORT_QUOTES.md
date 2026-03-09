OVERLAY M81.7.7 — Fix escaped import quotes

Problem:
Node ESM crashed with SyntaxError due to lines like:
import {...} from \"../notifications/stopProgressNotifs.js\";

Fix:
Run tools/fix-escaped-import-quotes.ps1 then reset-and-pack.
