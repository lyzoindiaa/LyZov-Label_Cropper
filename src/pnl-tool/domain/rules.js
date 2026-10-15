/**
 * Channel Fee & Rule Engine
 * Deterministic and pure evaluation of marketplace fee structures.
 * Supports Percent, Flat, and Tiered rules with full mathematical explainability.
 */

import { Money } from './money.js';

export function evaluateRule(rule, orderLine) {
  const currency = orderLine.currency || 'INR';
  const grossSalesMoney = Money.fromMinor(orderLine.grossSales || 0, currency);
  const qty = Number(orderLine.quantity) || 1;

  let feeAmountPaise = 0;
  let explanation = '';

  if (rule.calc === 'percent') {
    const pct = Number(rule.params.percent || 0);
    const feeMoney = grossSalesMoney.multiplyPercent(pct);
    feeAmountPaise = feeMoney.amount;
    explanation = `${pct}% of gross sales (${grossSalesMoney.toFormatted()}) = ${feeMoney.toFormatted()}`;
  } else if (rule.calc === 'flat') {
    const flatPerUnit = Number(rule.params.flatPaise || 0);
    const applyPerQty = rule.params.perQuantity !== false;
    feeAmountPaise = applyPerQty ? flatPerUnit * qty : flatPerUnit;
    explanation = `Flat ${Money.fromMinor(flatPerUnit, currency).toFormatted()}${applyPerQty ? ` x ${qty} units` : ''}`;
  } else if (rule.calc === 'tiered') {
    const price = grossSalesMoney.toMajor();
    const tiers = rule.params.tiers || [];
    let matchedTier = null;

    for (const tier of tiers) {
      const min = tier.min !== undefined ? tier.min : 0;
      const max = tier.max !== undefined ? tier.max : Infinity;
      if (price >= min && price <= max) {
        matchedTier = tier;
        break;
      }
    }

    if (matchedTier) {
      if (matchedTier.type === 'percent') {
        const feeMoney = grossSalesMoney.multiplyPercent(matchedTier.value);
        feeAmountPaise = feeMoney.amount;
        explanation = `Tier [₹${matchedTier.min || 0} - ₹${matchedTier.max || '∞'}]: ${matchedTier.value}% = ${feeMoney.toFormatted()}`;
      } else {
        const flatPaise = Math.round((matchedTier.value || 0) * 100);
        feeAmountPaise = flatPaise;
        explanation = `Tier [₹${matchedTier.min || 0} - ₹${matchedTier.max || '∞'}]: Flat ${Money.fromMinor(flatPaise, currency).toFormatted()}`;
      }
    }
  }

  return {
    ruleId: rule.id || rule._id,
    ruleName: rule.name,
    component: rule.component,
    amountPaise: feeAmountPaise,
    currency,
    explanation,
  };
}

export function evaluateRuleSet(rules = [], orderLine) {
  const activeRules = rules.filter(r => r.isActive !== false && (!r.channelId || r.channelId === orderLine.channelId));
  // Sort by priority ascending (lower number = higher priority)
  activeRules.sort((a, b) => (a.priority || 10) - (b.priority || 10));

  const feeComponents = {};
  const explanations = [];

  for (const rule of activeRules) {
    // If component already set by higher priority rule, skip
    if (feeComponents[rule.component]) continue;

    const res = evaluateRule(rule, orderLine);
    feeComponents[rule.component] = Money.fromMinor(res.amountPaise, res.currency);
    explanations.push(res);
  }

  return {
    fees: feeComponents,
    explanations,
  };
}
