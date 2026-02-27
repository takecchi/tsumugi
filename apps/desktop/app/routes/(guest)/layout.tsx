import { useAuthState } from '~/hooks/auth';
import { Navigate, Outlet } from 'react-router';
import { PATH_HOME } from '~/constants/path';
import { LoadingPage } from '@tsumugi/ui';

/**
 * ログイン状態の場合のみ表示
 * @constructor
 */
export default function Layout() {
  const { data, isLoading } = useAuthState();
  // ローディング中はローディングページを表示
  if (isLoading) {
    return <LoadingPage message="ログイン情報を確認しています" />;
  }
  // ログイン状態の場合はホームにリダイレクト
  if (data && data.isAuthenticated){
    return <Navigate to={PATH_HOME} replace />;
  }

  return <Outlet />;
}
