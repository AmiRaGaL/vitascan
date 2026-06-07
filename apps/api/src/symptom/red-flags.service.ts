import { Injectable } from '@nestjs/common';
import type { StructuredSymptomRequest } from '@vitascan/shared';

@Injectable()
export class RedFlagsService {
  evaluate(data: StructuredSymptomRequest) {
    let hasRedFlags = false;
    const reasons: string[] = [];

    // Flatten all answers into a searchable string
    const allAnswers = data.answers
      .map((a) =>
        Array.isArray(a.answer)
          ? a.answer.join(' ').toLowerCase()
          : a.answer.toLowerCase(),
      )
      .join(' ');

    const isChestPain = data.symptom_name.toLowerCase().includes('chest pain');

    // RULE 1: Chest pain + breathing or radiation issues
    if (
      isChestPain &&
      (allAnswers.includes('shortness of breath') ||
        allAnswers.includes('arm') ||
        allAnswers.includes('jaw'))
    ) {
      hasRedFlags = true;
      reasons.push(
        'Chest pain with high-risk associated symptoms (breathing/radiation)',
      );
    }

    // RULE 2: Severe sudden pain
    if (
      allAnswers.includes('worst of my life') ||
      allAnswers.includes('sudden severe')
    ) {
      hasRedFlags = true;
      reasons.push('Sudden, severe pain');
    }

    const hasPersistentFever =
      allAnswers.includes('persistent fever') ||
      (allAnswers.includes('fever') &&
        (allAnswers.includes('more than 24 hours') ||
          allAnswers.includes('over 24 hours') ||
          allAnswers.includes('more than a day')));
    const hasModeratePersistentPain =
      allAnswers.includes('moderate pain') &&
      (allAnswers.includes('more than 24 hours') ||
        allAnswers.includes('over 24 hours') ||
        allAnswers.includes('more than a day'));

    if (!hasRedFlags && (hasPersistentFever || hasModeratePersistentPain)) {
      hasRedFlags = true;
      reasons.push(
        hasPersistentFever
          ? 'Persistent fever'
          : 'Moderate pain lasting more than 24 hours',
      );
    }

    const triageLevel = reasons.some(
      (reason) =>
        reason.includes('Chest pain') || reason.includes('Sudden, severe'),
    )
      ? 'emergency'
      : 'urgent_care';

    return {
      hasRedFlags,
      overrides: hasRedFlags
        ? {
            triageLevel,
            redFlags: reasons,
            homeCareAdvice:
              triageLevel === 'emergency'
                ? '🚨 SEEK IMMEDIATE EMERGENCY MEDICAL CARE. Call 911 or go to the nearest emergency room.'
                : 'Seek urgent medical care today, especially if symptoms persist, worsen, or feel concerning.',
            doctorVisitPreparationTips:
              triageLevel === 'emergency'
                ? 'Do not drive yourself to the ER. Have someone drive you or call an ambulance.'
                : 'Bring a list of symptoms, timing, medications, and any relevant health history.',
          }
        : {},
    };
  }
}
