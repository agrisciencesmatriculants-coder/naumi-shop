import { memo } from 'react';

/**
 * Ambient decoration layer — retired in the premium re-theme.
 * Falling pink petals read playful/childish; the new design language is
 * quiet luxury (espresso, champagne gold, ivory) with no floating kitsch.
 * The component stays exported so existing imports keep working.
 */
function Petals() {
  return null;
}

export default memo(Petals);
