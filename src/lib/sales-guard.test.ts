import { describe, expect, it } from 'vitest';
import { validateSalesMessage } from './sales-guard';

const products = [{ nom: 'Formation', prix: 15000, devise: 'XOF', lien_maketou: 'https://maketou.com/p/formation' }];
describe('validateSalesMessage', () => {
  it('accepte le prix et le lien réels', () => {
    expect(validateSalesMessage('La formation coûte 15 000 FCFA : https://maketou.com/p/formation', products).ok).toBe(true);
    expect(validateSalesMessage('Prix : 15.000 F CFA', products).ok).toBe(true);
  });
  it('bloque un prix inventé', () => {
    const r = validateSalesMessage('Elle coûte 12 000 FCFA seulement', products);
    expect(r.ok).toBe(false); expect(r.violations[0]).toMatch(/montant/);
  });
  it('bloque un lien non référencé', () => {
    expect(validateSalesMessage('Payez ici https://evil.example/pay', products).ok).toBe(false);
  });
  it('bloque une remise non référencée, mais accepte celle des consignes vendeur', () => {
    expect(validateSalesMessage('Je vous fais -20% aujourd’hui', products).ok).toBe(false);
    expect(validateSalesMessage('Promo -20% jusqu’à dimanche', products, 'Promo -20% jusqu’à dimanche').ok).toBe(true);
  });
  it('bloque une confirmation de paiement non vérifiable', () => {
    expect(validateSalesMessage('Votre paiement bien reçu, merci !', products).ok).toBe(false);
    expect(validateSalesMessage('Order confirmed!', products).ok).toBe(false);
  });
  it('laisse passer un message sans prix ni lien', () => {
    expect(validateSalesMessage('Bonjour ! Que souhaitez-vous savoir sur la formation ?', products).ok).toBe(true);
  });
});
