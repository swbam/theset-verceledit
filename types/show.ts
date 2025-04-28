export interface Show {
  id: string;
  title: string;
  date: string;
  venue: string;
  description: string;
  image_url?: string;
  ticket_url?: string;
  price?: number;
  capacity?: number;
  is_sold_out?: boolean;
  created_at: string;
} 