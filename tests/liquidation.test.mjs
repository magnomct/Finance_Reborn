import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  liquidateTransaction, 
  applyTransactionLiquidation,
  PAYMENT_METHOD_OPTIONS 
} from '../src/utils/liquidation.ts';

describe('Transaction Liquidation and Payment Method Tests', () => {
  test('PAYMENT_METHOD_OPTIONS includes Dinheiro, Cartão de Crédito and Conta Corrente', () => {
    assert.equal(PAYMENT_METHOD_OPTIONS.length, 3);
    const ids = PAYMENT_METHOD_OPTIONS.map(o => o.id);
    assert.deepEqual(ids, ['Dinheiro', 'Cartão de Crédito', 'Conta Corrente']);
  });

  test('liquidateTransaction sets status to liquidado and assigns Dinheiro', () => {
    const tx = {
      id: 'tx-1',
      date: '2026-10-25',
      description: 'Supermercado Mensal',
      amount: -450,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'agendado'
    };

    const liquidated = liquidateTransaction(tx, 'Dinheiro');
    assert.equal(liquidated.status, 'liquidado');
    assert.equal(liquidated.paymentMethod, 'Dinheiro');
    assert.equal(liquidated.account, 'Dinheiro');
  });

  test('liquidateTransaction sets status to liquidado and routes to Cartão de Crédito (C6)', () => {
    const tx = {
      id: 'tx-2',
      date: '2026-10-25',
      description: 'Farmácia Remédios',
      amount: -120,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'agendado'
    };

    const liquidated = liquidateTransaction(tx, 'Cartão de Crédito');
    assert.equal(liquidated.status, 'liquidado');
    assert.equal(liquidated.paymentMethod, 'Cartão de Crédito');
    assert.equal(liquidated.account, 'C6');
  });

  test('liquidateTransaction preserves existing card name if already a card', () => {
    const tx = {
      id: 'tx-3',
      date: '2026-10-25',
      description: 'Eletrônicos',
      amount: -800,
      type: 'despesa',
      jar: 'DIV_10',
      costCenter: 'Magno',
      account: 'NUBANK MASTER',
      status: 'agendado'
    };

    const liquidated = liquidateTransaction(tx, 'Cartão de Crédito');
    assert.equal(liquidated.status, 'liquidado');
    assert.equal(liquidated.paymentMethod, 'Cartão de Crédito');
    assert.equal(liquidated.account, 'NUBANK MASTER');
  });

  test('liquidateTransaction sets status to liquidado and assigns Conta Corrente', () => {
    const tx = {
      id: 'tx-4',
      date: '2026-10-25',
      description: 'Energia Elétrica Enel',
      amount: -210,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'C6',
      status: 'agendado'
    };

    const liquidated = liquidateTransaction(tx, 'Conta Corrente');
    assert.equal(liquidated.status, 'liquidado');
    assert.equal(liquidated.paymentMethod, 'Conta Corrente');
    assert.equal(liquidated.account, 'Inter PF');
  });

  test('applyTransactionLiquidation updates matching transaction and leaves others unchanged', () => {
    const transactions = [
      { id: '1', description: 'A', status: 'agendado', amount: -100, account: 'Inter PF' },
      { id: '2', description: 'B', status: 'agendado', amount: -200, account: 'Inter PF' },
      { id: '3', description: 'C', status: 'liquidado', amount: -300, account: 'C6' }
    ];

    const updated = applyTransactionLiquidation(transactions, '2', 'Cartão de Crédito');
    assert.equal(updated.length, 3);
    assert.equal(updated[0].status, 'agendado');
    assert.equal(updated[1].status, 'liquidado');
    assert.equal(updated[1].paymentMethod, 'Cartão de Crédito');
    assert.equal(updated[1].account, 'C6');
    assert.equal(updated[2].status, 'liquidado');
  });
});
