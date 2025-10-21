/**
 * Formats a timestamp for conversation list display
 * Returns relative time for recent messages, formatted date for older ones
 */
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en', { weekday: 'short' });
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

/**
 * Formats a timestamp for message display in chat
 */
export function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Formats a date for message grouping headers
 */
export function formatDateHeader(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en', { weekday: 'long' });
  return date.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' });
}

