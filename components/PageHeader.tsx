import ThemeToggle from './ThemeToggle';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        {action}
        <ThemeToggle />
      </div>
    </div>
  );
}
