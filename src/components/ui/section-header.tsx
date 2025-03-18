import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLink?: string;
  actionText?: string;
  className?: string;
  count?: number;
}

export function SectionHeader({
  title,
  subtitle,
  actionLink,
  actionText,
  count,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        
        {actionLink && (
          <Link 
            to={actionLink}
            className="text-sm text-zinc-400 flex items-center hover:text-white transition-colors group"
          >
            {actionText}
            {count !== undefined && ` (${count})`}
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>
      
      {subtitle && (
        <p className="text-sm text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
} 