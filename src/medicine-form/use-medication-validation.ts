import { useState } from 'react';
import {
  type MedicationDraft,
  type MedicationFormIssue,
  validateMedicationDraft,
  validateMedicationStep,
} from './medication-form';

export function useMedicationValidation() {
  const [fieldIssue, setFieldIssue] = useState<MedicationFormIssue | null>(null);
  const [bannerIssue, setBannerIssue] = useState<MedicationFormIssue | null>(null);

  const clear = () => {
    setFieldIssue(null);
    setBannerIssue(null);
  };
  const checkStep = (draft: MedicationDraft, step: number): boolean => {
    const issue = validateMedicationStep(draft, step);
    setFieldIssue(issue);
    setBannerIssue(null);
    return issue === null;
  };
  const checkAll = (draft: MedicationDraft): MedicationFormIssue | null => {
    const issue = validateMedicationDraft(draft);
    setFieldIssue(issue);
    setBannerIssue(issue);
    return issue;
  };

  return { fieldIssue, bannerIssue, checkStep, checkAll, clear };
}
