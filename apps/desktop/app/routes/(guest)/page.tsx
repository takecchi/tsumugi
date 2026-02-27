import { type MetaFunction } from 'react-router';
import { Button, GoogleLogo } from '@tsumugi/ui';
import {
  PenLineIcon,
  NetworkIcon,
  UsersIcon,
  StickyNoteIcon,
  SparklesIcon,
  BookOpenIcon,
} from 'lucide-react';
import { cn, Separator } from '@tsumugi/ui';
import { FeatureCard } from '~/routes/(guest)/_components/feature-card';
import { useGoogleLogin } from '~/hooks/auth';
import { useCallback } from 'react';

export const meta: MetaFunction = () => [
  { title: 'Tsumugi - プロジェクト' },
  { name: 'description', content: 'AI-powered novel writing editor' },
];

export default function Page() {
  const { trigger: getGoogleUrl } = useGoogleLogin();

  const handleGoogleLogin = useCallback(() => {
    getGoogleUrl().then((url) => {
      window.location.href = url.url;
    });
  }, []);

  return (
    <div className={cn('flex min-h-screen flex-col bg-background')}>
      {/* ─── ヒーローセクション ─── */}
      <section className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
          {/* 左: 画像エリア */}
          <div className="flex items-center justify-center">
            <img
              src="/sample-image.png"
              alt="Tsumugi エディタの画面"
              className="w-full rounded-xl border shadow-lg"
            />
          </div>
          {/* 右: テキスト + CTA */}
          <div className="relative flex flex-col gap-6 overflow-hidden">
            <img
              src="/tsumugi-chan.png"
              alt="tsumugi-chan"
              aria-hidden
              className="pointer-events-none absolute right-0 bottom-0 z-0 h-full w-auto select-none object-contain object-right-bottom opacity-30"
            />
            {/* コンテンツ（キャラ画像の手前） */}
            <div className="relative z-10 flex flex-col gap-6">
              {/* アプリ名 */}
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
                Tsumugi
              </h1>
              {/* キャッチコピー */}
              <p className="text-xl leading-relaxed text-muted-foreground sm:text-2xl">
                あなたの物語を、AIとともに紡ぐ。
              </p>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                プロット設計からキャラクター造形、執筆まで。
                <br />
                AIアシスタントが創作のすべてに寄り添う、小説執筆エディタ。
              </p>
              {/* CTA */}
              <div className="mt-2 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-3 px-8"
                  onClick={handleGoogleLogin}
                >
                  <GoogleLogo className="size-5" />
                  Googleでログインして始める
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Separator />
      {/* ─── 特徴セクション ─── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold tracking-tight">
            創作に必要なすべてが、ここに
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<PenLineIcon className="size-6" />}
              title="執筆エディタ"
              description="シンプルで集中できるエディタ。文字数カウントで進捗を把握。"
            />
            <FeatureCard
              icon={<NetworkIcon className="size-6" />}
              title="プロット管理"
              description="物語の構成をツリー構造で整理。あらすじ、テーマ、葛藤を一元管理。"
            />
            <FeatureCard
              icon={<UsersIcon className="size-6" />}
              title="キャラクター設計"
              description="外見、性格、動機、人間関係。キャラクターの詳細を漏れなく設計。"
            />
            <FeatureCard
              icon={<StickyNoteIcon className="size-6" />}
              title="メモ・資料"
              description="世界観設定や調べた資料をタグ付きで整理。いつでもすぐに参照。"
            />
            <FeatureCard
              icon={<SparklesIcon className="size-6" />}
              title="AIアシスタント"
              description="プロットの相談から文章の推敲まで。AIがあなたの創作パートナーに。"
            />
            <FeatureCard
              icon={<BookOpenIcon className="size-6" />}
              title="プロジェクト管理"
              description="作品ごとにプロジェクトを分けて管理。複数作品の並行執筆も快適。"
            />
          </div>
        </div>
      </section>

      {/* ─── フッター ─── */}
      <footer className="border-t px-6 py-8">
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Tsumugi
        </p>
      </footer>
    </div>
  );
}
