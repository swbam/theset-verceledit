import Image from 'next/image';
import Link from 'next/link';
import { Show } from '@/types/show';
import { formatDate } from '@/lib/utils/date';
import { CalendarIcon, MapPinIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';

interface ShowCardProps {
  show: Show;
}

export default function ShowCard({ show }: ShowCardProps) {
  return (
    <Link href={`/shows/${show.id}`}>
      <div className="group bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl">
        <div className="relative h-48 w-full">
          <Image
            src={show.image_url || '/images/default-show.jpg'}
            alt={show.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-30" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">
              {show.title}
            </h3>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <CalendarIcon className="h-5 w-5 mr-2" />
            <span>{formatDate(show.date)}</span>
          </div>
          
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <MapPinIcon className="h-5 w-5 mr-2" />
            <span className="line-clamp-1">{show.venue.name}</span>
          </div>
          
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <MusicalNoteIcon className="h-5 w-5 mr-2" />
            <span className="line-clamp-1">{show.artist.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
} 