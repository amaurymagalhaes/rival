'use client';

import { useState, useTransition } from 'react';
import { IconRobot, IconUser } from '@tabler/icons-react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { detectAiContent, type AiDetectorResult } from '@/app/actions/ai-detector';

type Props = {
  content: string;
};

function verdictColor(verdict: string) {
  if (verdict.includes('HUMAN')) return 'text-green-600';
  if (verdict.includes('AI')) return 'text-red-500';
  return 'text-amber-500';
}

function VerdictIcon({ verdict }: { verdict: string }) {
  if (verdict.includes('HUMAN'))
    return <IconUser size={18} className="text-green-600" aria-hidden="true" />;
  return <IconRobot size={18} className="text-red-500" aria-hidden="true" />;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${
          value < 30
            ? 'bg-green-500'
            : value < 70
              ? 'bg-amber-500'
              : 'bg-red-500'
        }`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function AiDetectorButton({ content }: Props) {
  const [result, setResult] = useState<AiDetectorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const { data, error: err } = await detectAiContent(content);
      if (err) {
        setError(err);
        setResult(null);
      } else {
        setResult(data);
      }
    });
  }

  if (!result) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isPending}
          className="gap-2"
        >
          {isPending ? (
            <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
          ) : (
            <IconRobot size={16} aria-hidden="true" />
          )}
          {isPending ? 'Analyzing...' : 'AI Check'}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/75 bg-accent/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VerdictIcon verdict={result.verdict} />
          <span className={`text-sm font-semibold ${verdictColor(result.verdict)}`}>
            {result.verdict}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {result.words} words analyzed
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">AI probability</span>
          <span className="tabular-nums font-medium">{result.probability}%</span>
        </div>
        <ProgressBar value={result.probability} />
      </div>

      <button
        onClick={() => setResult(null)}
        className="self-end text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
