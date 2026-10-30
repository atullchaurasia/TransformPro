// BMI for measurements (spec §5.2 measurements.bmi "computed on save").

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

/** kg / m², rounded to 1 decimal. Null when either value is missing or implausible. */
export function computeBmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (weightKg == null || heightCm == null) return null;
  if (!(weightKg > 0 && weightKg < 500 && heightCm >= 50 && heightCm < 300)) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** WHO adult bands. */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}
