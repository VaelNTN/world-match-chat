const PROFANITY_WORDS = [
  'fuck',
  'fucking',
  'fucker',
  'fucked',
  'motherfucker',
  'shit',
  'shitting',
  'bullshit',
  'bitch',
  'bitches',
  'asshole',
  'bastard',
  'cunt',
  'dickhead',
  'whore',
  'slut',
  'faggot',
  'nigger',
  'nigga',
  'retard',
  'retarded',
  'kanker',
  'tering',
  'tyfus',
  'klootzak',
  'hoer',
  'kutwijf',
  'scheisse',
  'arschloch',
  'hurensohn',
  'puta',
  'putain',
  'connard',
  'salope',
];

const PROFANITY_REGEX = new RegExp(`\\b(${PROFANITY_WORDS.join('|')})\\b`, 'gi');

export function filterProfanity(text: string): string {
  return text.replace(PROFANITY_REGEX, (match) => {
    if (match.length <= 2) return '**';
    return `${match[0]}${'*'.repeat(match.length - 1)}`;
  });
}
