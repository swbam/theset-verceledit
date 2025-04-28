import Image from 'next/image';
import { formatDate } from '@/lib/utils/date';
import { Show } from '@/types/show';

interface ShowCardProps {
  show: Show;
}

export default function ShowCard({ show }: ShowCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transform transition duration-300 hover:scale-105">
      <div className="relative h-48">
        <Image
          src={show.image_url || '/images/default-show.jpg'}
          alt={show.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{show.title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{formatDate(show.date)}</p>
        <div className="flex justify-between items-center">
          <span className="text-primary-600 font-medium">{show.venue}</span>
          <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm">
            ${show.price}
          </span>
        </div>
        {show.description && (
          <p className="mt-4 text-gray-600 dark:text-gray-300 line-clamp-2">
            {show.description}
          </p>
        )}
      </div>
    </div>
  );
} 