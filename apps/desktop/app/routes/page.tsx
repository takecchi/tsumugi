import { Button } from '@tsumugi/ui';

export function meta() {
  return [
    { title: 'Tsumugi - AI Novel Studio' },
    { name: 'description', content: 'AI-powered novel writing editor' },
  ];
}

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Tsumugi</h1>
      <p className="text-muted-foreground">AI Novel Studio</p>
      <Button>Get Started</Button>
    </main>
  );
}
