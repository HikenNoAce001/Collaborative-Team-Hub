import sanitizeHtml from 'sanitize-html';

// Allowlist per REQUIREMENTS.md §F.1 — Tiptap HTML, server-side sanitized before persist.
const ALLOWED_TAGS = [
  'p',
  'br',
  'h1',
  'h2',
  'h3',
  'strong',
  'em',
  'u',
  's',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'img',
];

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
};

const OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform(
      'a',
      { rel: 'noopener noreferrer', target: '_blank' },
      true,
    ),
  },
};

/**
 * @param {string} html
 * @returns {string}
 */
export function sanitizeRichText(html) {
  return sanitizeHtml(html, OPTIONS);
}
