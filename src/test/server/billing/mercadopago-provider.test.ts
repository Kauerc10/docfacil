import { describe, expect, it } from 'bun:test';
import { MercadoPagoBillingProvider } from '@/lib/server/billing/mercadopago/provider';
import type { IMercadoPagoClient } from '@/lib/server/billing/mercadopago/client';

describe('MercadoPagoBillingProvider', () => {
  const mockClient: IMercadoPagoClient = {
    createPayment: async (payload) => ({
      id: 123456789,
      status: 'pending',
      point_of_interaction: {
        transaction_data: {
          qr_code: '00020126580014BR.GOV.BCB.PIX...',
          qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAA...',
        },
      },
      date_of_expiration: '2026-09-21T12:00:00.000Z',
    }),
    getPayment: async (id) => ({
      id: Number(id),
      status: 'approved',
      status_detail: 'accredited',
      date_approved: '2026-09-21T11:30:00.000Z',
      external_reference: 'ord_test_123',
    }),
    createPreference: async (payload) => ({
      id: 'pref_987654321',
      init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_987654321',
      sandbox_init_point: 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_987654321',
    }),
  };

  it('cria pagamento avulso via Pix retornando copia-e-cola e qrCode base64', async () => {
    const provider = new MercadoPagoBillingProvider(mockClient);

    const result = await provider.createOneTimePayment({
      orderId: 'ord_test_123',
      product: 'avulso',
      amountCents: 1990,
      method: 'pix',
      payer: {
        email: 'cliente@example.com',
        name: 'Cliente Teste',
      },
      completionUrl: 'http://localhost:3000/sucesso',
    });

    expect(result.kind).toBe('pix');
    if (result.kind === 'pix') {
      expect(result.providerPaymentId).toBe('123456789');
      expect(result.providerStatus).toBe('pending');
      expect(result.brCode).toContain('BR.GOV.BCB.PIX');
      expect(result.brCodeBase64).toContain('iVBORw0KGgo');
      expect(result.expiresAt).toBe('2026-09-21T12:00:00.000Z');
    }
  });

  it('cria assinatura Pro retornando checkoutUrl hospedado do Mercado Pago', async () => {
    const provider = new MercadoPagoBillingProvider(mockClient);

    const result = await provider.createSubscription({
      orderId: 'ord_pro_456',
      product: 'pro',
      amountCents: 3490,
      payer: {
        email: 'pro@example.com',
        userId: 'usr_pro_1',
        name: 'Pro User',
      },
      completionUrl: 'http://localhost:3000/sucesso',
    });

    expect(result.kind).toBe('hosted');
    if (result.kind === 'hosted') {
      expect(result.providerCheckoutId).toBe('pref_987654321');
      expect(result.checkoutUrl).toContain('mercadopago.com.br/checkout');
    }
  });

  it('consulta status do pagamento e mapeia approved para paid', async () => {
    const provider = new MercadoPagoBillingProvider(mockClient);

    const status = await provider.checkPaymentStatus('123456789');
    expect(status.status).toBe('paid');
    expect(status.externalId).toBe('123456789');
    expect(status.paidAt).toBeDefined();
  });
});
