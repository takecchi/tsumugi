import { useAuthState } from '~/hooks/auth';
import { Navigate, Outlet } from 'react-router';
import { PATH_TOP } from '~/constants/path';
import { LoadingPage } from '@tsumugi/ui';

/**
 * ログイン状態の場合のみ表示
 * @constructor
 */
export default function Layout() {
  const { data, isLoading } = useAuthState();
  // ローディング中は何も表示しない
  if (isLoading) {
    return <LoadingPage message="ログイン情報を確認しています" />;
  }
  // 非ログイン状態の場合はトップにリダイレクト
  if (!data || !data.isAuthenticated) {
    return <Navigate to={PATH_TOP} replace />;
  }

  return <Outlet />;
}
