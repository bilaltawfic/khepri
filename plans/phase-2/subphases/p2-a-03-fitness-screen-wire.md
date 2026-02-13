# P2-A-03: Wire Onboarding Fitness Screen to Context

## Branch
```bash
git checkout feat/p2-a-03-fitness-screen-wire
```

## Goal
Wire the onboarding fitness screen (`apps/mobile/app/onboarding/fitness.tsx`) to use the OnboardingContext for state management. Currently all inputs have `editable={false}` and don't save any data.

## Current State
- `apps/mobile/app/onboarding/fitness.tsx` - Has UI but inputs are disabled (`editable={false}`)
- `apps/mobile/contexts/OnboardingContext.tsx` - Already exists with `setFitnessNumbers()` method
- The context supports: `ftp`, `restingHR`, `maxHR`, `weight`

## Changes Required

### 1. Update FitnessInput component to be editable

The `FitnessInput` component needs to:
- Accept `value` and `onChangeText` props
- Remove `editable={false}`
- Add error state support

```typescript
type FitnessInputProps = {
  label: string;
  unit: string;
  placeholder: string;
  hint?: string;
  colorScheme: 'light' | 'dark';
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  accessibilityLabel?: string;
};

function FitnessInput({
  label, unit, placeholder, hint, colorScheme,
  value, onChangeText, error, accessibilityLabel
}: FitnessInputProps) {
  return (
    <View style={styles.inputGroup}>
      <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
        {label}
      </ThemedText>
      {hint && (
        <ThemedText type="caption" style={styles.inputHint}>
          {hint}
        </ThemedText>
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].surface,
              color: Colors[colorScheme].text,
              borderColor: error ? Colors[colorScheme].error : Colors[colorScheme].border,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors[colorScheme].textTertiary}
          keyboardType="numeric"
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel={accessibilityLabel ?? label}
        />
        <View style={[styles.unitBadge, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
          <ThemedText type="caption">{unit}</ThemedText>
        </View>
      </View>
      {error && (
        <ThemedText
          type="caption"
          style={[styles.errorText, { color: Colors[colorScheme].error }]}
          accessibilityRole="alert"
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
}
```

### 2. Add form state and validation to FitnessScreen

```typescript
import { useOnboarding } from '@/contexts';

type FormData = {
  ftp: string;
  lthr: string;
  runThresholdPace: string;
  css: string;
  restingHR: string;
  maxHR: string;
};

// Validation ranges
const VALIDATION = {
  ftp: { min: 50, max: 500, label: 'FTP' },
  lthr: { min: 80, max: 200, label: 'LTHR' },
  restingHR: { min: 30, max: 100, label: 'Resting HR' },
  maxHR: { min: 100, max: 220, label: 'Max HR' },
};

function validateNumber(value: string, min: number, max: number): boolean {
  if (!value.trim()) return true; // Empty is valid (optional)
  const num = Number(value);
  return !Number.isNaN(num) && Number.isInteger(num) && num >= min && num <= max;
}

export default function FitnessScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, setFitnessNumbers } = useOnboarding();

  // Initialize from context (for back navigation)
  const [formData, setFormData] = useState<FormData>({
    ftp: data.ftp?.toString() ?? '',
    lthr: '', // LTHR not in context yet
    runThresholdPace: '', // Pace not in context yet
    css: '', // CSS not in context yet
    restingHR: data.restingHR?.toString() ?? '',
    maxHR: data.maxHR?.toString() ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    for (const [field, config] of Object.entries(VALIDATION)) {
      const value = formData[field as keyof FormData];
      if (!validateNumber(value, config.min, config.max)) {
        newErrors[field as keyof FormData] =
          `${config.label} should be ${config.min}-${config.max}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    // Save to context
    setFitnessNumbers({
      ftp: formData.ftp ? Number(formData.ftp) : undefined,
      restingHR: formData.restingHR ? Number(formData.restingHR) : undefined,
      maxHR: formData.maxHR ? Number(formData.maxHR) : undefined,
    });

    router.push('/onboarding/goals');
  };

  // ... rest of component
}
```

### 3. Wire inputs to form state

Update each `FitnessInput` to use the form state:

```typescript
<FitnessInput
  label="FTP (Functional Threshold Power)"
  unit="watts"
  placeholder="e.g., 250"
  hint="Your sustainable power for ~1 hour"
  colorScheme={colorScheme}
  value={formData.ftp}
  onChangeText={(text) => updateField('ftp', text)}
  error={errors.ftp}
/>
```

### 4. Add test file

Create `apps/mobile/app/onboarding/__tests__/fitness.test.tsx`:

```typescript
import { render, fireEvent, screen } from '@testing-library/react-native';
import FitnessScreen from '../fitness';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

// Mock OnboardingContext
const mockSetFitnessNumbers = jest.fn();
jest.mock('@/contexts', () => ({
  useOnboarding: () => ({
    data: { goals: [] },
    setFitnessNumbers: mockSetFitnessNumbers,
  }),
}));

describe('FitnessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all fitness input fields', () => {
    render(<FitnessScreen />);

    expect(screen.getByLabelText('FTP (Functional Threshold Power)')).toBeTruthy();
    expect(screen.getByLabelText('Resting Heart Rate')).toBeTruthy();
    expect(screen.getByLabelText('Max Heart Rate')).toBeTruthy();
  });

  it('allows entering FTP value', () => {
    render(<FitnessScreen />);

    const ftpInput = screen.getByLabelText('FTP (Functional Threshold Power)');
    fireEvent.changeText(ftpInput, '250');

    expect(ftpInput.props.value).toBe('250');
  });

  it('shows validation error for out-of-range FTP', () => {
    render(<FitnessScreen />);

    const ftpInput = screen.getByLabelText('FTP (Functional Threshold Power)');
    fireEvent.changeText(ftpInput, '600'); // Over max

    const continueButton = screen.getByLabelText('Continue to goals');
    fireEvent.press(continueButton);

    expect(screen.getByText(/FTP should be 50-500/)).toBeTruthy();
  });

  it('saves valid data to context on continue', () => {
    render(<FitnessScreen />);

    const ftpInput = screen.getByLabelText('FTP (Functional Threshold Power)');
    fireEvent.changeText(ftpInput, '250');

    const continueButton = screen.getByLabelText('Continue to goals');
    fireEvent.press(continueButton);

    expect(mockSetFitnessNumbers).toHaveBeenCalledWith(
      expect.objectContaining({ ftp: 250 })
    );
  });

  it('allows skipping without entering any data', () => {
    render(<FitnessScreen />);

    const skipButton = screen.getByLabelText('Skip fitness numbers');
    fireEvent.press(skipButton);

    // Should navigate without errors
    expect(require('expo-router').router.push).toHaveBeenCalledWith('/onboarding/goals');
  });
});
```

## Files to Modify
- `apps/mobile/app/onboarding/fitness.tsx` - Main changes

## Files to Create
- `apps/mobile/app/onboarding/__tests__/fitness.test.tsx` - Tests

## Validation Rules
| Field | Min | Max | Unit |
|-------|-----|-----|------|
| FTP | 50 | 500 | watts |
| LTHR | 80 | 200 | bpm |
| Resting HR | 30 | 100 | bpm |
| Max HR | 100 | 220 | bpm |

## Checklist
- [ ] Remove `editable={false}` from all TextInput components
- [ ] Add `value` and `onChangeText` props to FitnessInput
- [ ] Add form state with useState
- [ ] Import and use `useOnboarding` context
- [ ] Initialize form from context data (for back navigation)
- [ ] Add validation for numeric ranges
- [ ] Show validation errors
- [ ] Call `setFitnessNumbers()` on continue
- [ ] Add accessibility labels
- [ ] Write tests
- [ ] Run `pnpm lint` and `pnpm test`

## PR Guidelines
- Keep PR focused on this single task
- Ensure all tests pass
- Follow conventional commit: `feat(mobile): wire onboarding fitness screen to context`
