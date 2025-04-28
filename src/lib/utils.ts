import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

export function generateShowUrl(params: {
  artistName: string;
  cityName: string;
  date: Date | string;
  showId: string;
  setlistId?: string;
}): string {
  const { artistName, cityName, date, showId, setlistId } = params;
  
  // Format date as YYYY-MM-DD
  const formattedDate = typeof date === 'string' ? 
    new Date(date) : date;
  
  const dateStr = format(formattedDate, 'yyyy-MM-dd');
  
  // Build URL parts
  const artistSlug = slugify(artistName);
  const citySlug = slugify(cityName);
  
  // Base URL with artist, city and date
  let url = `/artists/${artistSlug}/${citySlug}-${dateStr}`;
  
  // Add show ID
  url += `/show-${showId}`;
  
  // Add setlist ID if available
  if (setlistId) {
    url += `/setlist-${setlistId}`;
  }
  
  return url;
}

export function generateArtistUrl(artistName: string): string {
  return `/artists/${slugify(artistName)}`;
}

// Parse show URL to extract components
export function parseShowUrl(url: string): {
  artistSlug: string;
  citySlug: string;
  date: string;
  showId: string;
  setlistId?: string;
} | null {
  // Match URL pattern
  const pattern = /^\/artists\/([^\/]+)\/([^-]+)-(\d{4}-\d{2}-\d{2})\/show-([^\/]+)(?:\/setlist-(.+))?$/;
  const match = url.match(pattern);
  
  if (!match) return null;
  
  const [, artistSlug, citySlug, date, showId, setlistId] = match;
  
  return {
    artistSlug,
    citySlug, 
    date,
    showId,
    setlistId
  };
}

/**
 * Format a date for display
 */
export function formatDate(dateString: string, includeDay: boolean = false): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }
    
    return includeDay 
      ? format(date, 'EEEE, MMMM d, yyyy')
      : format(date, 'MMMM d, yyyy');
  } catch (error) {
    return dateString;
  }
}

/**
 * Format a date into an object with day, month and year
 */
export function formatDateObject(dateString: string) {
  try {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      year: date.getFullYear()
    };
  } catch (error) {
    return { day: "TBA", month: "", year: "" };
  }
}

export function formatVenue(name: string, city: string, state: string): string {
  if (!name && !city && !state) return 'No venue information';
  
  const location = city && state ? `${city}, ${state}` : city || state || '';
  return name ? `${name}${location ? ` - ${location}` : ''}` : location;
}

export function truncateText(text: string, maxLength: number = 150): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength).trim()}...`;
}
