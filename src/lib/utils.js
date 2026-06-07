/**
 * Standard utility function to merge className inputs.
 * Matches standard Shadcn UI/Radix helper conventions.
 *
 * @param {...string|Object|Array} inputs - Array of class lists or condition configurations.
 * @returns {string} Combined classes list.
 */
export function cn(...inputs) {
  return inputs
    .flatMap((input) => {
      if (!input) return [];
      if (typeof input === 'string') return input.split(' ');
      if (Array.isArray(input)) return cn(...input).split(' ');
      if (typeof input === 'object') {
        return Object.entries(input)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key);
      }
      return [];
    })
    .filter(Boolean)
    .join(' ');
}

export default cn;
