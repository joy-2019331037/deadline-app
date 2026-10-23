import { useState, type FormEvent } from 'react';
import { SQUAD_ROLES, type ContractTerms } from '../../api/types.ts';
import { formatMoney, formatWage } from '../../lib/format.ts';
import { ACTION_COSTS, ROLE_TEXT } from '../../lib/negotiation.ts';
import {
  formValuesFrom,
  validateOffer,
  type OfferContext,
  type OfferErrors,
  type OfferField,
  type OfferFormValues,
} from '../../lib/offerForm.ts';
import styles from './Negotiation.module.css';

interface OfferBuilderProps {
  initialTerms: ContractTerms | null;
  proposedTerms: ContractTerms | null;
  context: OfferContext;
  pending: boolean;
  serverErrors: OfferErrors;
  serverMessage: string | null;
  onSubmit: (terms: ContractTerms) => void;
}

const AMOUNT_FIELDS: { field: OfferField; label: string; unit: string; step: string }[] = [
  { field: 'transferFeeM', label: 'Transfer fee', unit: '£M', step: '0.1' },
  { field: 'weeklyWageK', label: 'Weekly wage', unit: '£K/wk', step: '1' },
  { field: 'signingBonusK', label: 'Signing bonus', unit: '£K', step: '10' },
  { field: 'loyaltyBonusK', label: 'Loyalty bonus', unit: '£K', step: '10' },
  { field: 'goalBonusK', label: 'Goal bonus', unit: '£K per goal', step: '1' },
  { field: 'appearanceBonusK', label: 'Appearance bonus', unit: '£K per game', step: '1' },
  { field: 'releaseClauseM', label: 'Release clause', unit: '£M, optional', step: '1' },
];

export function OfferBuilder({
  initialTerms,
  proposedTerms,
  context,
  pending,
  serverErrors,
  serverMessage,
  onSubmit,
}: OfferBuilderProps) {
  const [values, setValues] = useState<OfferFormValues>(() => formValuesFrom(initialTerms));
  const [errors, setErrors] = useState<OfferErrors>({});
  const shownErrors = { ...serverErrors, ...errors };

  const update = <K extends OfferField>(field: K, value: OfferFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateOffer(values, context);
    setErrors(result.errors);
    if (result.terms) onSubmit(result.terms);
  };

  const describedBy = (field: OfferField) => (shownErrors[field] ? `${field}-error` : undefined);
  const fieldError = (field: OfferField) =>
    shownErrors[field] ? (
      <span id={`${field}-error`} className={styles.fieldError}>
        {shownErrors[field]}
      </span>
    ) : null;

  return (
    <form className={styles.offerForm} onSubmit={submit} noValidate aria-label="Offer builder">
      {proposedTerms && (
        <button
          type="button"
          className={styles.link}
          onClick={() => setValues(formValuesFrom(proposedTerms))}
        >
          Fill in their latest demands
        </button>
      )}
      <div className={styles.fields}>
        {AMOUNT_FIELDS.map(({ field, label, unit, step }) => (
          <div key={field} className={styles.field}>
            <label htmlFor={`offer-${field}`} className={styles.label}>
              {label} <span className={styles.unit}>({unit})</span>
            </label>
            <input
              id={`offer-${field}`}
              type="number"
              inputMode="decimal"
              min="0"
              step={step}
              className={styles.input}
              value={String(values[field])}
              aria-invalid={shownErrors[field] ? true : undefined}
              aria-describedby={describedBy(field)}
              onChange={(event) => update(field, event.target.value)}
            />
            {fieldError(field)}
          </div>
        ))}
        <div className={styles.field}>
          <label htmlFor="offer-contractYears" className={styles.label}>
            Contract length
          </label>
          <select
            id="offer-contractYears"
            className={styles.input}
            value={values.contractYears}
            aria-invalid={shownErrors.contractYears ? true : undefined}
            aria-describedby={describedBy('contractYears')}
            onChange={(event) => update('contractYears', event.target.value)}
          >
            {[1, 2, 3, 4, 5].map((years) => (
              <option key={years} value={years}>
                {years} year{years === 1 ? '' : 's'}
              </option>
            ))}
          </select>
          {fieldError('contractYears')}
        </div>
        <div className={styles.field}>
          <label htmlFor="offer-squadRole" className={styles.label}>
            Squad role
          </label>
          <select
            id="offer-squadRole"
            className={styles.input}
            value={values.squadRole}
            aria-invalid={shownErrors.squadRole ? true : undefined}
            aria-describedby={describedBy('squadRole')}
            onChange={(event) => update('squadRole', event.target.value as OfferFormValues['squadRole'])}
          >
            {SQUAD_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_TEXT[role]}
              </option>
            ))}
          </select>
          {fieldError('squadRole')}
        </div>
        <div className={styles.field}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={values.captaincy}
              aria-invalid={shownErrors.captaincy ? true : undefined}
              aria-describedby={describedBy('captaincy')}
              onChange={(event) => update('captaincy', event.target.checked)}
            />
            Offer the captaincy
          </label>
          {fieldError('captaincy')}
        </div>
      </div>
      <p className={styles.muted}>
        Budget available: {formatMoney(context.transferBudget)} · {formatWage(context.wageBudget)}
      </p>
      {serverMessage && (
        <p className={styles.error} role="alert">
          {serverMessage}
        </p>
      )}
      <button type="submit" className={styles.primary} disabled={pending}>
        Submit offer · {ACTION_COSTS.offer} hours
      </button>
    </form>
  );
}
