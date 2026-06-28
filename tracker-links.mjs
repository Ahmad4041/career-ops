#!/usr/bin/env node
/**
 * tracker-links.mjs — Normalize report markdown links relative to tracker location.
 *
 * TSV additions use root-relative links: [num](reports/...).
 * When merged into data/applications.md, rewrite to ../reports/...
 * Root-layout trackers keep reports/... as-is. Idempotent.
 */

import { relative, resolve, sep } from 'path';

const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const REPORTS_SEGMENT = `${sep}reports${sep}`;

function isReportPath(href) {
  if (!href || /^https?:\/\//i.test(href)) return false;
  const normalized = href.replace(/\\/g, '/');
  return (
    normalized.startsWith('reports/') ||
    normalized.startsWith('../reports/') ||
    normalized.includes('/reports/')
  );
}

/**
 * @param {string} reportField — markdown link or table cell containing one
 * @param {string} trackerDir — directory containing applications.md
 * @param {string} reportsRoot — repo root (parent of reports/)
 */
export function normalizeReportLink(reportField, trackerDir, reportsRoot) {
  if (!reportField || typeof reportField !== 'string') return reportField;

  return reportField.replace(MD_LINK_RE, (full, label, href) => {
    if (!isReportPath(href)) return full;

    const absReport = resolve(reportsRoot, href.replace(/^\.\.\//, '').replace(/^reports\//, 'reports/'));
    const absTracker = resolve(trackerDir);
    let rel = relative(absTracker, absReport).replace(/\\/g, '/');
    return `[${label}](${rel})`;
  });
}
