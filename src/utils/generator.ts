export function generateRandomWords(words: string[], count: number): string {
  if (!words || words.length === 0) return '';
  let result = [];
  for (let i = 0; i < count; i++) {
    result.push(words[Math.floor(Math.random() * words.length)]);
  }
  return result.join(' ');
}

export function generateRandomText(letters: string, length: number, maxComb: number): string {
  if (!letters) return '';
  let result = '';
  let currentComb = 0;
  let lastChar = '';

  for (let i = 0; i < length; i++) {
    // 20% chance of space, but not at the beginning, not after a space, and not at the end
    if (i > 0 && i < length - 1 && lastChar !== ' ' && Math.random() < 0.2) {
      result += ' ';
      lastChar = ' ';
      currentComb = 0;
      continue;
    }

    let char = letters[Math.floor(Math.random() * letters.length)];
    
    // Enforce max_comb
    if (char === lastChar) {
      currentComb++;
      if (currentComb >= maxComb) {
        // Pick a different character
        const otherChars = letters.replace(new RegExp(char, 'g'), '');
        if (otherChars.length > 0) {
          char = otherChars[Math.floor(Math.random() * otherChars.length)];
        }
        currentComb = 1;
      }
    } else {
      currentComb = 1;
    }

    result += char;
    lastChar = char;
  }

  return result;
}
