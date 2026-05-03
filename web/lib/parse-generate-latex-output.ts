/** generate-latex.mjs prints a single trailing JSON blob to stdout (validation / compile summary). */

type LatexReport = {
  compileError?: string;
  issues?: string[];
  valid?: boolean;
  compiled?: boolean;
};

export function summarizeGenerateLatexFailure(stdout: string): string | null {
  const t = stdout.trim();
  if (!t) return null;
  const lastBrace = t.lastIndexOf('{');
  if (lastBrace < 0) return null;
  const sliced = t.slice(lastBrace);
  let report: LatexReport;
  try {
    report = JSON.parse(sliced) as LatexReport;
  } catch {
    return null;
  }

  const parts: string[] = [];
  if (typeof report.compileError === 'string' && report.compileError.trim()) parts.push(report.compileError.trim());

  /** Validation issues before compile */
  if (Array.isArray(report.issues) && report.issues.length) parts.push(report.issues.join('; '));

  const combined = parts.join(' — ');
  if (!combined) return null;

  if (/No LaTeX engine found/i.test(combined)) {
    return `${combined}\n\nOn macOS: install tectonic with Homebrew (\`brew install tectonic\`) or install a TeX distro with pdflatex (MacTeX). If Homebrew refuses, run \`sudo xcodebuild -license accept\` first.`;
  }

  return combined;
}
