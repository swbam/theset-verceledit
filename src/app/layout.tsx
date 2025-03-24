import './globals.css';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">TheSet</Link>
            <nav>
              <ul className="flex space-x-4">
                <li><Link href="/" className="hover:text-blue-500">Home</Link></li>
                <li><Link href="/artists" className="hover:text-blue-500">Artists</Link></li>
                <li><Link href="/admin" className="hover:text-blue-500">Admin</Link></li>
              </ul>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
} 