import { RubricGuide } from '@/components/RubricGuide';
import { PageHeader } from '@/components/ui';

export const metadata = { title: 'Rubric guide' };

export default function GuidePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        kicker="Judges' table"
        title="Rubric guide"
        subtitle="Anchors for scoring AI usage consistently. Score 2 or 4 when behaviour falls between two anchors. Judge the player's behaviour, not the quality of the AI's answers."
      />
      <RubricGuide />
    </main>
  );
}
