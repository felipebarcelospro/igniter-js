import * as p from '@clack/prompts';

export async function handleGenerateFeatureAction(name: string | undefined, options: { schema?: string }) {
  p.intro('Generate Feature');

  // Lógica de scaffolding da feature virá aqui

  p.outro('Feature generation complete!');
}
