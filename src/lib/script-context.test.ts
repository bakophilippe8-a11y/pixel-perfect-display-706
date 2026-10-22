import { describe, expect, it } from 'vitest';
import { buildScriptContext } from './script-context';

const products = [{ nom: 'Sérum', prix: 15000, devise: 'XOF', argument_cle: 'Peau nette' }];

describe('buildScriptContext', () => {
  it('garde au plus les 50 derniers messages', () => {
    const messages = Array.from({ length: 80 }, (_, i) => ({ author: 'client', content: `message ${i}`, created_at: '2026-01-01' }));
    const context = buildScriptContext({ contactStatus: 'Prospect', channel: 'whatsapp', messages, products });
    expect(context).not.toContain('message 0');
    expect(context).toContain('message 79');
  });

  it('tronque chaque message à 500 caractères', () => {
    const messages = [{ author: 'client', content: 'x'.repeat(900), created_at: '2026-01-01' }];
    const context = buildScriptContext({ contactStatus: 'Prospect', channel: 'whatsapp', messages, products });
    expect(context).not.toContain('x'.repeat(501));
  });

  it('exclut les messages système et de décision interne', () => {
    const messages = [{ author: 'system', content: 'secret interne', created_at: '2026-01-01' }];
    const context = buildScriptContext({ contactStatus: 'Prospect', channel: 'whatsapp', messages, products });
    expect(context).not.toContain('secret interne');
  });
});
