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

    return {
      hasRedFlags,
      overrides: hasRedFlags
        ? {
            triageLevel: 'emergency',
            redFlags: reasons,
            homeCareAdvice:
              '🚨 SEEK IMMEDIATE EMERGENCY MEDICAL CARE. Call 911 or go to the nearest emergency room.',
            doctorVisitPreparationTips:
              'Do not drive yourself to the ER. Have someone drive you or call an ambulance.',
          }
        : {},
    };
  }
}
