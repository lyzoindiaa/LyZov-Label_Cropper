import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeWaterfallBridge, simulatePriceChange, simulateReturnRateChange } from '../../src/pnl-tool/domain/bridge.js';

describe('Bridge & Simulators Tests', () => {
  it('should decompose profit delta and ensure sum(drivers) === totalDelta', () => {
    const periodA = {
      units: 100,
      netRevenue: 100000,
      totalFees: 20000,
      cogsTotal: 40000,
      contribution: 40000,
    };

    const periodB = {
      units: 120,
      netRevenue: 130000,
      totalFees: 28000,
      cogsTotal: 48000,
      contribution: 54000,
    };

    const bridge = computeWaterfallBridge(periodA, periodB);
    assert.equal(bridge.totalDelta, 14000); // 54000 - 40000

    const sumDrivers = bridge.drivers.reduce((acc, d) => acc + d.impact, 0);
    assert.equal(sumDrivers, bridge.totalDelta);
  });

  it('should simulate price change and compute break-even correctly', () => {
    const sim = simulatePriceChange({
      currentPricePaise: 50000, // ₹500
      newPricePaise: 45000, // ₹450
      cogsPaise: 15000, // ₹150
      feePercent: 15,
      fixedFeePaise: 2000, // ₹20
      returnRatePct: 10,
    });

    assert.ok(sim.newPrice === 450);
    assert.ok(sim.breakEvenPrice > 150);
    assert.ok(sim.isProfitable);
  });

  it('should simulate return rate change with reverse logistics impact', () => {
    const sim = simulateReturnRateChange({
      totalOrders: 1000,
      avgOrderValuePaise: 50000, // ₹500
      currentReturnRatePct: 10,
      deltaRatePct: 2, // +2% returns = 20 additional returns
      avgReverseLogisticsPaise: 6000, // ₹60
    });

    assert.equal(sim.newReturnRate, 12);
    assert.equal(sim.additionalReturns, 20);
    // (20 * 500) + (20 * 60) = 10000 + 1200 = 11200 loss
    assert.equal(sim.profitImpactINR, -11200);
  });
});
