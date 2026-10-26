import Link from 'next/link';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* The teammate's UI renders normally here */}
        {children}

        {/* Floating Developer Navigation Menu */}
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1e293b',
            padding: '12px 24px',
            borderRadius: '9999px',
            display: 'flex',
            gap: '24px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            zIndex: 9999
          }}
        >
          <Link href="/borrower" style={{ color: '#60a5fa', fontWeight: 'bold', textDecoration: 'none' }}>
            Borrower
          </Link>
          <Link href="/lender" style={{ color: '#34d399', fontWeight: 'bold', textDecoration: 'none' }}>
            Lender
          </Link>
          <Link href="/admin" style={{ color: '#f87171', fontWeight: 'bold', textDecoration: 'none' }}>
            Admin
          </Link>
        </div>
      </body>
    </html>
  );
}