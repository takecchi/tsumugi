import { Link, Outlet } from 'react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { PATH_TOP } from '~/constants/path';

export default function LegalLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to={PATH_TOP}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          トップに戻る
        </Link>
        <Outlet />
      </div>
    </div>
  );
}
