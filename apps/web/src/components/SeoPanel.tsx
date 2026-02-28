'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, SearchCheck } from 'lucide-react';
import { analyzeSeo, type SeoAnalysis } from '@/app/actions/seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type SeoPanelProps = {
  blogId: string;
};

function ScoreBadge({ score }: { score: number }) {
  let color = 'bg-destructive/10 text-destructive';
  if (score >= 60) color = 'bg-emerald-100 text-emerald-700';
  else if (score >= 30) color = 'bg-amber-100 text-amber-700';

  return (
    <span className={`rounded-md px-2.5 py-1 text-sm font-semibold ${color} tabular-nums`}>
      {score}/100
    </span>
  );
}

function KeywordRow({
  word,
  count,
  density,
}: {
  word: string;
  count: number;
  density: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/70 py-2 last:border-0">
      <span className="font-medium">{word}</span>
      <span className="tabular-nums text-sm text-muted-foreground">
        {count}× ({density}%)
      </span>
    </div>
  );
}

export function SeoPanel({ blogId }: SeoPanelProps) {
  const [analysis, setAnalysis] = useState<SeoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    setError(null);
    startTransition(async () => {
      const result = await analyzeSeo(blogId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setAnalysis(result.data);
        setIsOpen(true);
      }
    });
  }

  return (
    <div className="w-full max-w-3xl space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleAnalyze}
        disabled={isPending}
        className="inline-flex items-center gap-1.5"
      >
        <SearchCheck size={16} aria-hidden="true" />
        {isPending ? 'Analyzing…' : 'Analyze SEO'}
      </Button>

      {error && (
        <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive" aria-live="polite">
          {error}
        </p>
      )}

      {analysis && (
        <Card className="border-border/75">
          <CardContent className="pt-6">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl border border-border/75 bg-white/72 px-4 py-3 text-left transition-[background-color,border-color] hover:bg-accent/55"
            >
              <span className="font-semibold">SEO Analysis</span>
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                {isOpen ? 'Collapse' : 'Expand'}
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={isOpen ? 'rotate-180' : ''}
                />
              </span>
            </button>

            {isOpen && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <section className="rounded-xl border border-border/75 bg-white/72 p-4">
                  <h3 className="text-sm font-semibold">Readability</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <ScoreBadge score={analysis.readability.score} />
                    <span className="capitalize text-sm text-muted-foreground">
                      {analysis.readability.level}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Avg {analysis.readability.avgWordsPerSentence} words/sentence,
                    {' '}
                    {analysis.readability.avgSyllablesPerWord} syllables/word.
                  </p>
                </section>

                <section className="rounded-xl border border-border/75 bg-white/72 p-4">
                  <h3 className="text-sm font-semibold">Reading Time</h3>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {analysis.readingTime.minutes} min
                  </p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {analysis.readingTime.wordCount} words
                  </p>
                </section>

                <section className="rounded-xl border border-border/75 bg-white/72 p-4">
                  <h3 className="text-sm font-semibold">Top Keywords</h3>
                  <div className="mt-2">
                    {analysis.keywords.topKeywords.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No dominant keywords yet.</p>
                    ) : (
                      analysis.keywords.topKeywords.map((kw) => (
                        <KeywordRow key={kw.word} {...kw} />
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-border/75 bg-white/72 p-4">
                  <h3 className="text-sm font-semibold">Meta Description</h3>
                  <p className="mt-2 rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">
                    {analysis.metaDescription}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {analysis.metaDescription.length}/160 characters
                  </p>
                </section>

                <section className="rounded-xl border border-border/75 bg-white/72 p-4 sm:col-span-2">
                  <h3 className="text-sm font-semibold">Title Analysis</h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-md px-2 py-1 font-semibold ${
                        analysis.titleAnalysis.isOptimalLength
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <span className="tabular-nums">{analysis.titleAnalysis.length}</span> chars
                    </span>
                    {analysis.titleAnalysis.hasNumbers && (
                      <span className="rounded-md bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                        Has numbers
                      </span>
                    )}
                    {analysis.titleAnalysis.hasPowerWords && (
                      <span className="rounded-md bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                        Has power words
                      </span>
                    )}
                  </div>
                </section>

                {analysis.suggestions.length > 0 && (
                  <section className="rounded-xl border border-border/75 bg-white/72 p-4 sm:col-span-2">
                    <h3 className="text-sm font-semibold">Suggestions</h3>
                    <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
                      {analysis.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
