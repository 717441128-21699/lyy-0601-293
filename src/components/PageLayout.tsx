interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export default function PageLayout({
  title,
  children,
  rightAction,
  leftAction,
  headerExtra,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 safe-top">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          {leftAction || <div className="w-10" />}
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {rightAction || <div className="w-10" />}
        </div>
        {headerExtra}
      </header>
      <main className="max-w-md mx-auto px-4 pt-4">{children}</main>
    </div>
  );
}
