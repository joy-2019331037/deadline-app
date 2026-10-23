import { describe, expect, it } from 'vitest';
import { formValuesFrom, serverErrorsToFields, validateOffer, type OfferFormValues } from './offerForm.ts';

const context = { playerAge: 26, transferBudget: 85_000_000, wageBudget: 320_000 };
const values = (overrides: Partial<OfferFormValues> = {}): OfferFormValues => ({
  ...formValuesFrom(null),
  transferFeeM: '53',
  weeklyWageK: '150',
  ...overrides,
});

describe('offer form', () => {
  it('converts the form to whole-pound contract terms', () => {
    expect(validateOffer(values({ signingBonusK: '920', releaseClauseM: '90' }), context)).toEqual({
      errors: {},
      terms: {
        transferFee: 53_000_000,
        weeklyWage: 150_000,
        contractYears: 4,
        signingBonus: 920_000,
        goalBonus: 0,
        appearanceBonus: 0,
        loyaltyBonus: 0,
        releaseClause: 90_000_000,
        squadRole: 'STARTER',
        captaincy: false,
      },
    });
  });

  it('round-trips existing terms', () => {
    const { terms } = validateOffer(values({ transferFeeM: '57.3', weeklyWageK: '176' }), context);
    expect(terms && formValuesFrom(terms)).toMatchObject({ transferFeeM: '57.3', weeklyWageK: '176' });
  });

  it('requires a fee and a wage', () => {
    const { terms, errors } = validateOffer(values({ transferFeeM: '', weeklyWageK: '' }), context);

    expect(terms).toBeNull();
    expect(errors).toMatchObject({
      transferFeeM: 'Enter a transfer fee',
      weeklyWageK: 'Enter a weekly wage',
    });
  });

  it('rejects negative or nonsense amounts', () => {
    expect(validateOffer(values({ transferFeeM: '-5' }), context).errors.transferFeeM).toMatch(/positive/);
    expect(validateOffer(values({ goalBonusK: 'abc' }), context).errors.goalBonusK).toMatch(/positive/);
    expect(validateOffer(values({ weeklyWageK: '0.5' }), context).errors.weeklyWageK).toMatch(/at least/);
  });

  it('applies the contract rules', () => {
    const errorsFor = (overrides: Partial<OfferFormValues>, age = 26) =>
      validateOffer(values(overrides), { ...context, playerAge: age }).errors;

    expect(errorsFor({ releaseClauseM: '20' }).releaseClauseM).toMatch(/lower than the fee/);
    expect(errorsFor({ captaincy: true, squadRole: 'ROTATION' }).captaincy).toMatch(/starter or key player/);
    expect(errorsFor({ squadRole: 'PROSPECT' }).squadRole).toMatch(/21 or under/);
    expect(errorsFor({ squadRole: 'PROSPECT' }, 19).squadRole).toBeUndefined();
    expect(errorsFor({ contractYears: '5' }, 34).contractYears).toMatch(/38th birthday/);
    expect(errorsFor({ goalBonusK: '200' }).goalBonusK).toMatch(/too high/);
    expect(errorsFor({ appearanceBonusK: '40', weeklyWageK: '30' }).appearanceBonusK).toMatch(/weekly wage/);
  });

  it('checks the budgets', () => {
    expect(
      validateOffer(values({ transferFeeM: '84', signingBonusK: '2000' }), context).errors.transferFeeM,
    ).toMatch(/transfer budget/);
    expect(validateOffer(values({ weeklyWageK: '321' }), context).errors.weeklyWageK).toMatch(/wage budget/);
    expect(validateOffer(values({ transferFeeM: '85', weeklyWageK: '320' }), context).terms).not.toBeNull();
  });

  it('maps server error paths onto form fields', () => {
    expect(
      serverErrorsToFields([
        { path: 'terms.weeklyWage', message: 'Too much' },
        { path: 'body.terms.releaseClause', message: 'Too low' },
        { path: 'expectedVersion', message: 'Ignored' },
      ]),
    ).toEqual({ weeklyWageK: 'Too much', releaseClauseM: 'Too low' });
  });
});
