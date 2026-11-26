export const countOf = (count, word, plural = `${word}s`) =>
  `${count} ${count === 1 ? word : plural}`
