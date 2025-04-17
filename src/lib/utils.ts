import { clsx, type ClassValue } from "clsx";
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
