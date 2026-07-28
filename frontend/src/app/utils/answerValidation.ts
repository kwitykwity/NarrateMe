/**
 * Validates if a spoken transcript matches the expected answer hint.
 * Uses fuzzy matching to account for speech recognition variations.
 */

export interface ValidationResult {
  isCorrect: boolean;
  confidence: number;
}

/**
 * Normalize a string for comparison:
 * - Lowercase
 * - Remove punctuation
 * - Trim whitespace
 * - Collapse multiple spaces
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings.
 * Returns the minimum number of single-character edits needed.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Calculate similarity ratio (0-1) between two strings.
 * 1.0 = identical, 0.0 = completely different
 */
function similarityRatio(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Extract key words from the answer hint.
 * Filters out common words that don't carry meaning.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "it", "its",
    "to", "of", "in", "on", "at", "by", "for", "with", "about",
    "that", "this", "these", "those", "and", "or", "but",
  ]);

  return normalize(text)
    .split(" ")
    .filter((word) => word.length > 1 && !stopWords.has(word));
}

/**
 * Validate if the transcript matches the expected answer.
 *
 * Matching strategies (in order of priority):
 * 1. Exact match (after normalization)
 * 2. Keywords from hint appear in transcript
 * 3. Fuzzy match with similarity threshold
 */
export function validateAnswer(
  transcript: string,
  answerHint: string
): ValidationResult {
  const normalizedTranscript = normalize(transcript);
  const normalizedHint = normalize(answerHint);

  // Empty transcript = no answer
  if (!normalizedTranscript) {
    return { isCorrect: false, confidence: 0 };
  }

  // Strategy 1: Exact match
  if (normalizedTranscript === normalizedHint) {
    return { isCorrect: true, confidence: 1.0 };
  }

  // Strategy 2: Check if answer hint is contained in transcript
  // e.g., hint="Lily" matches transcript="it was lily"
  if (normalizedTranscript.includes(normalizedHint)) {
    return { isCorrect: true, confidence: 0.95 };
  }

  // Strategy 3: Check if key words from hint appear in transcript
  const hintKeywords = extractKeywords(answerHint);
  const transcriptWords = normalizedTranscript.split(" ");

  if (hintKeywords.length > 0) {
    const matchedKeywords = hintKeywords.filter((keyword) =>
      transcriptWords.some((word) => {
        // Allow fuzzy match for each keyword
        return similarityRatio(word, keyword) >= 0.8;
      })
    );

    const keywordMatchRatio = matchedKeywords.length / hintKeywords.length;

    // If most keywords match, consider it correct
    if (keywordMatchRatio >= 0.7) {
      return { isCorrect: true, confidence: keywordMatchRatio * 0.9 };
    }
  }

  // Strategy 4: Overall fuzzy match
  const similarity = similarityRatio(normalizedTranscript, normalizedHint);

  // Threshold of 0.6 allows for speech recognition errors
  if (similarity >= 0.6) {
    return { isCorrect: true, confidence: similarity };
  }

  // No match
  return { isCorrect: false, confidence: similarity };
}
