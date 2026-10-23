import type { ContractTerms, SquadRole } from '../api/types.ts';

export interface OfferFormValues {
  transferFeeM: string;
  weeklyWageK: string;
  contractYears: string;
  squadRole: SquadRole;
  signingBonusK: string;
  goalBonusK: string;
  appearanceBonusK: string;
  loyaltyBonusK: string;
  releaseClauseM: string;
  captaincy: boolean;
}

export type OfferField = keyof OfferFormValues;
export type OfferErrors = Partial<Record<OfferField, string>>;

export interface OfferContext {
  playerAge: number;
  transferBudget: number;
  wageBudget: number;
}

const MAX_CONTRACT_END_AGE = 38;

const trimNumber = (value: number) => String(Number(value.toFixed(3)));

export function formValuesFrom(terms: ContractTerms | null): OfferFormValues {
  return {
    transferFeeM: terms ? trimNumber(terms.transferFee / 1_000_000) : '',
    weeklyWageK: terms?.weeklyWage ? trimNumber(terms.weeklyWage / 1_000) : '',
    contractYears: terms ? String(terms.contractYears) : '4',
    squadRole: terms?.squadRole ?? 'STARTER',
    signingBonusK: terms?.signingBonus ? trimNumber(terms.signingBonus / 1_000) : '',
    goalBonusK: terms?.goalBonus ? trimNumber(terms.goalBonus / 1_000) : '',
    appearanceBonusK: terms?.appearanceBonus ? trimNumber(terms.appearanceBonus / 1_000) : '',
    loyaltyBonusK: terms?.loyaltyBonus ? trimNumber(terms.loyaltyBonus / 1_000) : '',
    releaseClauseM: terms?.releaseClause ? trimNumber(terms.releaseClause / 1_000_000) : '',
    captaincy: terms?.captaincy ?? false,
  };
}

function parseAmount(value: string, scale: number): number | null {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * scale);
}

export function validateOffer(
  values: OfferFormValues,
  context: OfferContext,
): { terms: ContractTerms | null; errors: OfferErrors } {
  const errors: OfferErrors = {};
  const amount = (field: OfferField, scale: number, max: number, label: string) => {
    const parsed = parseAmount(String(values[field]), scale);
    if (parsed === null) errors[field] = `${label} must be a positive number`;
    else if (parsed > max) errors[field] = `${label} is too high`;
    return parsed ?? 0;
  };

  if (values.transferFeeM.trim() === '') errors.transferFeeM = 'Enter a transfer fee';
  const transferFee = amount('transferFeeM', 1_000_000, 300_000_000, 'The fee');
  if (values.weeklyWageK.trim() === '') errors.weeklyWageK = 'Enter a weekly wage';
  const weeklyWage = amount('weeklyWageK', 1_000, 1_000_000, 'The wage');
  if (!errors.weeklyWageK && weeklyWage < 1_000) errors.weeklyWageK = 'The wage must be at least £1K a week';

  const signingBonus = amount('signingBonusK', 1_000, 20_000_000, 'The signing bonus');
  const goalBonus = amount('goalBonusK', 1_000, 100_000, 'The goal bonus');
  const appearanceBonus = amount('appearanceBonusK', 1_000, 50_000, 'The appearance bonus');
  const loyaltyBonus = amount('loyaltyBonusK', 1_000, 20_000_000, 'The loyalty bonus');
  const releaseClauseValue = amount('releaseClauseM', 1_000_000, 1_000_000_000, 'The release clause');
  const releaseClause = values.releaseClauseM.trim() === '' ? null : releaseClauseValue;

  const contractYears = Number(values.contractYears);
  if (!Number.isInteger(contractYears) || contractYears < 1 || contractYears > 5) {
    errors.contractYears = 'Choose a contract of 1 to 5 years';
  } else if (context.playerAge + contractYears > MAX_CONTRACT_END_AGE) {
    errors.contractYears = `The contract would run past his ${MAX_CONTRACT_END_AGE}th birthday`;
  }

  if (releaseClause !== null && !errors.releaseClauseM && releaseClause < transferFee) {
    errors.releaseClauseM = 'A release clause cannot be lower than the fee';
  }
  if (values.captaincy && !['KEY_PLAYER', 'STARTER'].includes(values.squadRole)) {
    errors.captaincy = 'Only a starter or key player can be captain';
  }
  if (values.squadRole === 'PROSPECT' && context.playerAge > 21) {
    errors.squadRole = 'Only players aged 21 or under can join as prospects';
  }
  if (!errors.goalBonusK && goalBonus > weeklyWage) errors.goalBonusK = 'Cannot exceed the weekly wage';
  if (!errors.appearanceBonusK && appearanceBonus > weeklyWage) {
    errors.appearanceBonusK = 'Cannot exceed the weekly wage';
  }

  if (!errors.transferFeeM && !errors.signingBonusK && transferFee + signingBonus > context.transferBudget) {
    errors.transferFeeM = 'The fee and signing bonus exceed your transfer budget';
  }
  if (!errors.weeklyWageK && weeklyWage > context.wageBudget) {
    errors.weeklyWageK = 'The wage exceeds your remaining wage budget';
  }

  if (Object.keys(errors).length > 0) return { terms: null, errors };
  return {
    terms: {
      transferFee,
      weeklyWage,
      contractYears,
      signingBonus,
      goalBonus,
      appearanceBonus,
      loyaltyBonus,
      releaseClause,
      squadRole: values.squadRole,
      captaincy: values.captaincy,
    },
    errors,
  };
}

const SERVER_FIELDS: Record<string, OfferField> = {
  'terms.transferFee': 'transferFeeM',
  'terms.weeklyWage': 'weeklyWageK',
  'terms.contractYears': 'contractYears',
  'terms.squadRole': 'squadRole',
  'terms.signingBonus': 'signingBonusK',
  'terms.goalBonus': 'goalBonusK',
  'terms.appearanceBonus': 'appearanceBonusK',
  'terms.loyaltyBonus': 'loyaltyBonusK',
  'terms.releaseClause': 'releaseClauseM',
  'terms.captaincy': 'captaincy',
};

export function serverErrorsToFields(details: { path: string; message: string }[]): OfferErrors {
  const errors: OfferErrors = {};
  for (const detail of details) {
    const field = SERVER_FIELDS[detail.path.replace(/^body\./, '')];
    if (field) errors[field] = detail.message;
  }
  return errors;
}
