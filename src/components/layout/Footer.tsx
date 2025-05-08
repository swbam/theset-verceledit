import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built by{' '}
          <a
            href="https://theset.live"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            TheSet
          </a>
          . The source code is available on{' '}
          <a
            href="https://github.com/yourusername/theset"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
