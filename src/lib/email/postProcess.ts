// src/lib/email/postProcess.ts
import { extractContextHints, scoreSubject } from './subjectGuard';

type EmailJson = {
  subject: string;
  preheader: string;
  html: string;
  md: string;
  txt: string;
  __subject_candidates?: string[];
};

export function chooseBestSubject(
  email: EmailJson,
  contextPack: string,
  hypeLevel: 1|2|3|4|5 = 3
): EmailJson {
  const candidates = Array.from(
    new Set(
      (email.__subject_candidates || [])
        .concat(email.subject ? [email.subject] : [])
        .map(s => (s || '').trim())
        .filter(Boolean)
    )
  );

  if (!candidates.length) {
    const result = { ...email };
    delete result.__subject_candidates;
    return result;
  }

  const hints = extractContextHints(contextPack);
  const ranked = candidates
    .map(s => ({ s, sc: scoreSubject(s, hints, hypeLevel) }))
    .sort((a, b) => b.sc - a.sc);

  const result = { ...email };
  result.subject = ranked[0].s;
  delete result.__subject_candidates;
  return result;
}
