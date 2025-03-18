
// Define types for Ticketmaster API responses
export interface TicketmasterImage {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
}

export interface TicketmasterClassification {
  segment?: {
    name: string;
  };
  genre?: {
    name: string;
  };
  subGenre?: {
    name: string;
  };
}

export interface TicketmasterAttraction {
  id: string;
  name: string;
  url?: string;
  images?: TicketmasterImage[];
  classifications?: TicketmasterClassification[];
  upcomingEvents?: {
    _total?: string;
    [key: string]: any;
  };
}

export interface TicketmasterVenue {
  id: string;
  name: string;
  city?: { name: string };
  state?: { name: string };
  country?: { name: string };
  address?: { line1: string };
  location?: { latitude: string; longitude: string };
  upcomingEvents?: { totalEvents?: number; [key: string]: any };
}

export interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  images?: TicketmasterImage[];
  dates: {
    start: { dateTime: string; localDate?: string };
    status?: { code: string };
  };
  sales?: {
    public?: {
      startDateTime?: string;
    };
  };
  rank?: number;
  classifications?: TicketmasterClassification[];
  _embedded?: {
    venues?: TicketmasterVenue[];
    attractions?: TicketmasterAttraction[];
  };
}

export interface TicketmasterEventsResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
  page?: {
    totalElements: number;
  };
}
