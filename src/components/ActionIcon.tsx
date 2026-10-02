type IconName = 'right' | 'down' | 'spin' | 'lock' | 'flag';

export default function ActionIcon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg className={`action-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {name === 'right' && <path d="M4 12h16m-6-6 6 6-6 6" />}
      {name === 'down' && <path d="M12 4v16m-6-6 6 6 6-6" />}
      {name === 'spin' && <path d="M20 10a8 8 0 1 0-2 7M20 4v6h-6" />}
      {name === 'lock' && <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>}
      {name === 'flag' && <path d="M5 21V3m0 1c5-3 9 3 14 0v10c-5 3-9-3-14 0" />}
    </svg>
  );
}
