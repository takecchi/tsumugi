import { useAuthState } from '~/hooks/auth';
import { Navigate, Outlet } from 'react-router';
import { PATH_HOME } from '~/constants/path';

/**
 * ログイン状態の場合のみ表示
 * @constructor
 */
export default function Layout() {
  const { data, isLoading } = useAuthState();
  // ローディング中は何も表示しない
  if (isLoading) {
    // FIXME
    return <div>ログイン情報確認中</div>;
  }
  // ログイン状態の場合はホームにリダイレクト
  if (data && data.isAuthenticated){
    return <Navigate to={PATH_HOME} replace />;
  }

  return <Outlet />;
}
