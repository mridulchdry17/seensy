/** "?, ?, ?" for an IN (...) clause with `count` bound values. */
export const placeholders = (count: number): string => Array.from({ length: count }, () => "?").join(", ");
