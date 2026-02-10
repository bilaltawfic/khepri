import { Ionicons } from '@expo/vector-icons';
import type { ConstraintInsert, ConstraintRow, ConstraintUpdate } from '@khepri/supabase-client';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { Button } from '@/components/Button';
import { FormDatePicker } from '@/components/FormDatePicker';
import { FormInput } from '@/components/FormInput';
import { FormSelect, type SelectOption } from '@/components/FormSelect';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useConstraints } from '@/hooks';
import { formatDateLocal, parseDateOnly } from '@/utils/formatters';

import type { ConstraintType, InjurySeverity } from './constraints';

const VALID_CONSTRAINT_TYPES = new Set<ConstraintType>(['injury', 'travel', 'availability']);
const VALID_INJURY_SEVERITIES = new Set<InjurySeverity>(['mild', 'moderate', 'severe']);

function isValidConstraintType(value: unknown): value is ConstraintType {
  return typeof value === 'string' && VALID_CONSTRAINT_TYPES.has(value as ConstraintType);
}

function isValidInjurySeverity(value: unknown): value is InjurySeverity {
  return typeof value === 'string' && VALID_INJURY_SEVERITIES.has(value as InjurySeverity);
}

type FormData = {
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  // Injury-specific
  injuryBodyPart: string;
  injurySeverity: InjurySeverity | null;
  injuryRestrictions: string[];
  // Travel-specific
  travelDestination: string;
  travelEquipmentAvailable: string[];
  travelFacilitiesAvailable: string[];
  // Availability-specific
  availabilityHoursPerWeek: string;
  availabilityDaysAvailable: string[];
};

const severityOptions: SelectOption<InjurySeverity>[] = [
  { label: 'Mild - Can train with modifications', value: 'mild' },
  { label: 'Moderate - Significant limitations', value: 'moderate' },
  { label: 'Severe - Unable to train affected area', value: 'severe' },
];

const bodyPartOptions: SelectOption[] = [
  { label: 'Left Knee', value: 'left_knee' },
  { label: 'Right Knee', value: 'right_knee' },
  { label: 'Left Ankle', value: 'left_ankle' },
  { label: 'Right Ankle', value: 'right_ankle' },
  { label: 'Left Hip', value: 'left_hip' },
  { label: 'Right Hip', value: 'right_hip' },
  { label: 'Lower Back', value: 'lower_back' },
  { label: 'Upper Back', value: 'upper_back' },
  { label: 'Left Shoulder', value: 'left_shoulder' },
  { label: 'Right Shoulder', value: 'right_shoulder' },
  { label: 'Neck', value: 'neck' },
  { label: 'Left Foot', value: 'left_foot' },
  { label: 'Right Foot', value: 'right_foot' },
  { label: 'Left Calf', value: 'left_calf' },
  { label: 'Right Calf', value: 'right_calf' },
  { label: 'Left Hamstring', value: 'left_hamstring' },
  { label: 'Right Hamstring', value: 'right_hamstring' },
  { label: 'Left Quad', value: 'left_quad' },
  { label: 'Right Quad', value: 'right_quad' },
  { label: 'Other', value: 'other' },
];

const restrictionOptions = [
  { id: 'no_running', label: 'No running' },
  { id: 'no_cycling', label: 'No cycling' },
  { id: 'no_swimming', label: 'No swimming' },
  { id: 'no_high_intensity', label: 'No high intensity' },
  { id: 'no_impact', label: 'No impact activities' },
  { id: 'no_upper_body', label: 'No upper body' },
  { id: 'no_lower_body', label: 'No lower body' },
  { id: 'limited_volume', label: 'Limited training volume' },
];

const equipmentOptions = [
  { id: 'running_shoes', label: 'Running shoes' },
  { id: 'swim_goggles', label: 'Swim goggles' },
  { id: 'bike', label: 'Bike' },
  { id: 'bike_trainer', label: 'Bike trainer' },
  { id: 'resistance_bands', label: 'Resistance bands' },
  { id: 'yoga_mat', label: 'Yoga mat' },
  { id: 'heart_rate_monitor', label: 'Heart rate monitor' },
];

const facilityOptions = [
  { id: 'gym', label: 'Gym' },
  { id: 'pool', label: 'Pool' },
  { id: 'outdoor_running', label: 'Outdoor running routes' },
  { id: 'outdoor_cycling', label: 'Outdoor cycling routes' },
  { id: 'indoor_track', label: 'Indoor track' },
  { id: 'hotel_gym', label: 'Hotel gym' },
];

const dayOptions = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

const constraintTypeInfo: Record<
  ConstraintType,
  {
    title: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    description: string;
  }
> = {
  injury: {
    title: 'Injury',
    icon: 'bandage-outline',
    color: '#c62828',
    description: 'Log an injury so Khepri can adjust your training to help you recover.',
  },
  travel: {
    title: 'Travel',
    icon: 'airplane-outline',
    color: '#1976d2',
    description:
      'Traveling? Let Khepri know what equipment and facilities you will have access to.',
  },
  availability: {
    title: 'Availability Change',
    icon: 'time-outline',
    color: '#f9a825',
    description: 'Temporary schedule change? Khepri will adjust training volume accordingly.',
  },
};

const initialFormData: FormData = {
  title: '',
  description: '',
  startDate: new Date(),
  endDate: null,
  injuryBodyPart: '',
  injurySeverity: null,
  injuryRestrictions: [],
  travelDestination: '',
  travelEquipmentAvailable: [],
  travelFacilitiesAvailable: [],
  availabilityHoursPerWeek: '',
  availabilityDaysAvailable: [],
};

/**
 * Convert a ConstraintRow from the database to form data.
 * Validates enum fields to prevent invalid DB values from being re-saved.
 */
function constraintRowToFormData(row: ConstraintRow): FormData {
  return {
    title: row.title,
    description: row.description ?? '',
    startDate: parseDateOnly(row.start_date),
    endDate: row.end_date ? parseDateOnly(row.end_date) : null,
    injuryBodyPart: row.injury_body_part ?? '',
    injurySeverity: isValidInjurySeverity(row.injury_severity) ? row.injury_severity : null,
    injuryRestrictions: row.injury_restrictions ?? [],
    travelDestination: row.travel_destination ?? '',
    travelEquipmentAvailable: row.travel_equipment_available ?? [],
    travelFacilitiesAvailable: row.travel_facilities_available ?? [],
    availabilityHoursPerWeek: row.availability_hours_per_week?.toString() ?? '',
    availabilityDaysAvailable: row.availability_days_available ?? [],
  };
}

/**
 * Convert form data to the shape expected by the Supabase insert/update functions
 */
function formDataToConstraintData(
  formData: FormData,
  constraintType: ConstraintType
): Omit<ConstraintInsert, 'athlete_id'> | ConstraintUpdate {
  const base = {
    constraint_type: constraintType,
    title: formData.title.trim(),
    description: formData.description.trim() || null,
    start_date: formData.startDate
      ? formatDateLocal(formData.startDate)
      : formatDateLocal(new Date()),
    end_date: formData.endDate ? formatDateLocal(formData.endDate) : null,
  };

  switch (constraintType) {
    case 'injury':
      return {
        ...base,
        injury_body_part: formData.injuryBodyPart || null,
        injury_severity: formData.injurySeverity,
        injury_restrictions:
          formData.injuryRestrictions.length > 0 ? formData.injuryRestrictions : null,
      };
    case 'travel':
      return {
        ...base,
        travel_destination: formData.travelDestination.trim() || null,
        travel_equipment_available:
          formData.travelEquipmentAvailable.length > 0 ? formData.travelEquipmentAvailable : null,
        travel_facilities_available:
          formData.travelFacilitiesAvailable.length > 0 ? formData.travelFacilitiesAvailable : null,
      };
    case 'availability':
      return {
        ...base,
        availability_hours_per_week: formData.availabilityHoursPerWeek
          ? Number.parseFloat(formData.availabilityHoursPerWeek)
          : null,
        availability_days_available:
          formData.availabilityDaysAvailable.length > 0 ? formData.availabilityDaysAvailable : null,
      };
    default:
      return base;
  }
}

type CheckboxListProps = {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  colorScheme: 'light' | 'dark';
};

function CheckboxList({ options, selected, onChange, colorScheme }: Readonly<CheckboxListProps>) {
  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <View style={styles.checkboxList}>
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <Pressable
            key={option.id}
            style={[
              styles.checkboxItem,
              { backgroundColor: Colors[colorScheme].surface },
              isSelected && { borderColor: Colors[colorScheme].primary, borderWidth: 1 },
            ]}
            onPress={() => toggleOption(option.id)}
            accessibilityLabel={`${option.label}, ${isSelected ? 'selected' : 'not selected'}`}
            accessibilityRole="checkbox"
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: isSelected
                    ? Colors[colorScheme].primary
                    : Colors[colorScheme].border,
                },
                isSelected && { backgroundColor: Colors[colorScheme].primary },
              ]}
            >
              {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <ThemedText style={styles.checkboxLabel}>{option.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ConstraintFormScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const params = useLocalSearchParams<{ type?: string; id?: string }>();

  const {
    getConstraint,
    createConstraint,
    updateConstraint,
    deleteConstraint,
    resolveConstraint,
    isReady,
  } = useConstraints();

  const isEditing = !!params.id;

  // Validate constraint type from params - default to 'injury' if invalid
  const initialType = isValidConstraintType(params.type) ? params.type : 'injury';
  const [constraintType, setConstraintType] = useState<ConstraintType>(initialType);
  const typeInfo = constraintTypeInfo[constraintType];

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isLoadingConstraint, setIsLoadingConstraint] = useState(isEditing);
  const [constraintNotFound, setConstraintNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing constraint data if editing
  useEffect(() => {
    const constraintId = params.id;
    if (constraintId) {
      const loadConstraint = async () => {
        setIsLoadingConstraint(true);
        setConstraintNotFound(false);
        setLoadError(null);
        const { data: constraint, error } = await getConstraint(constraintId);
        if (constraint) {
          setFormData(constraintRowToFormData(constraint));
          // Validate constraint_type before setting to prevent crashes from invalid DB values
          if (isValidConstraintType(constraint.constraint_type)) {
            setConstraintType(constraint.constraint_type);
          }
        } else if (error) {
          // API/network error - show load error state
          setLoadError(error);
        } else {
          // Constraint genuinely not found - show not found state
          setConstraintNotFound(true);
        }
        setIsLoadingConstraint(false);
      };
      void loadConstraint();
    }
  }, [params.id, getConstraint]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Please enter a title';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Please select a start date';
    }

    if (constraintType === 'injury') {
      if (!formData.injuryBodyPart) {
        newErrors.injuryBodyPart = 'Please select the affected body part';
      }
      if (!formData.injurySeverity) {
        newErrors.injurySeverity = 'Please select the severity';
      }
    }

    if (constraintType === 'availability') {
      if (formData.availabilityHoursPerWeek) {
        const hours = Number.parseFloat(formData.availabilityHoursPerWeek);
        if (Number.isNaN(hours) || hours < 0 || hours > 168) {
          newErrors.availabilityHoursPerWeek = 'Please enter a valid number (0-168)';
        }
      } else {
        newErrors.availabilityHoursPerWeek = 'Please enter available hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // Prevent creating new constraints before hook is ready
    if (!isEditing && !isReady) {
      Alert.alert('Please wait', 'Loading your profile...');
      return;
    }

    setIsSaving(true);
    const constraintData = formDataToConstraintData(formData, constraintType);

    let result: { success: boolean; error?: string };
    if (isEditing && params.id) {
      result = await updateConstraint(params.id, constraintData);
    } else {
      result = await createConstraint(constraintData as Omit<ConstraintInsert, 'athlete_id'>);
    }

    setIsSaving(false);

    if (result.success) {
      Alert.alert(
        'Success',
        isEditing ? 'Constraint updated successfully' : 'Constraint added successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', result.error ?? 'Failed to save constraint');
    }
  };

  const handleResolve = () => {
    Alert.alert('Resolve Constraint', 'Mark this constraint as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: () => {
          void (async () => {
            if (!params.id) return;
            setIsSaving(true);
            const result = await resolveConstraint(params.id);
            setIsSaving(false);
            if (result.success) {
              router.back();
            } else {
              Alert.alert('Error', result.error ?? 'Failed to resolve constraint');
            }
          })();
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Constraint', 'Are you sure you want to delete this constraint?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (!params.id) return;
            setIsSaving(true);
            const result = await deleteConstraint(params.id);
            setIsSaving(false);
            if (result.success) {
              router.back();
            } else {
              Alert.alert('Error', result.error ?? 'Failed to delete constraint');
            }
          })();
        },
      },
    ]);
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const renderConstraintTypeFields = () => {
    switch (constraintType) {
      case 'injury':
        return (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Injury Details
            </ThemedText>

            <FormSelect
              label="Affected Body Part"
              value={formData.injuryBodyPart || null}
              options={bodyPartOptions}
              onChange={(value) => updateField('injuryBodyPart', value)}
              placeholder="Select body part"
              error={errors.injuryBodyPart}
            />

            <FormSelect
              label="Severity"
              value={formData.injurySeverity}
              options={severityOptions}
              onChange={(value) => updateField('injurySeverity', value)}
              placeholder="Select severity"
              error={errors.injurySeverity}
            />

            <View style={styles.fieldContainer}>
              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Training Restrictions
              </ThemedText>
              <ThemedText type="caption" style={styles.fieldDescription}>
                Select activities or intensities to avoid
              </ThemedText>
              <CheckboxList
                options={restrictionOptions}
                selected={formData.injuryRestrictions}
                onChange={(selected) => updateField('injuryRestrictions', selected)}
                colorScheme={colorScheme}
              />
            </View>
          </View>
        );

      case 'travel':
        return (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Travel Details
            </ThemedText>

            <FormInput
              label="Destination"
              value={formData.travelDestination}
              onChangeText={(text) => updateField('travelDestination', text)}
              placeholder="e.g., Tokyo, Japan"
            />

            <View style={styles.fieldContainer}>
              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Equipment Available
              </ThemedText>
              <ThemedText type="caption" style={styles.fieldDescription}>
                What training equipment will you have?
              </ThemedText>
              <CheckboxList
                options={equipmentOptions}
                selected={formData.travelEquipmentAvailable}
                onChange={(selected) => updateField('travelEquipmentAvailable', selected)}
                colorScheme={colorScheme}
              />
            </View>

            <View style={styles.fieldContainer}>
              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Facilities Available
              </ThemedText>
              <ThemedText type="caption" style={styles.fieldDescription}>
                What training facilities can you access?
              </ThemedText>
              <CheckboxList
                options={facilityOptions}
                selected={formData.travelFacilitiesAvailable}
                onChange={(selected) => updateField('travelFacilitiesAvailable', selected)}
                colorScheme={colorScheme}
              />
            </View>
          </View>
        );

      case 'availability':
        return (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Availability Details
            </ThemedText>

            <FormInput
              label="Available Hours Per Week"
              value={formData.availabilityHoursPerWeek}
              onChangeText={(text) => updateField('availabilityHoursPerWeek', text)}
              placeholder="Enter hours"
              keyboardType="decimal-pad"
              unit="hours"
              error={errors.availabilityHoursPerWeek}
              helpText="How many hours per week can you train?"
            />

            <View style={styles.fieldContainer}>
              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Available Days
              </ThemedText>
              <ThemedText type="caption" style={styles.fieldDescription}>
                Which days can you train during this period?
              </ThemedText>
              <CheckboxList
                options={dayOptions}
                selected={formData.availabilityDaysAvailable}
                onChange={(selected) => updateField('availabilityDaysAvailable', selected)}
                colorScheme={colorScheme}
              />
            </View>
          </View>
        );
    }
  };

  if (isLoadingConstraint) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
          <ThemedText style={styles.loadingText}>Loading constraint...</ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  if (loadError) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors[colorScheme].error} />
          <ThemedText type="defaultSemiBold" style={styles.errorTitle}>
            Failed to Load Constraint
          </ThemedText>
          <ThemedText style={styles.errorText}>{loadError}</ThemedText>
          <Button title="Go Back" onPress={() => router.back()} accessibilityLabel="Go back" />
        </View>
      </ScreenContainer>
    );
  }

  if (constraintNotFound) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors[colorScheme].error} />
          <ThemedText type="defaultSemiBold" style={styles.errorTitle}>
            Constraint Not Found
          </ThemedText>
          <ThemedText style={styles.errorText}>
            The constraint you're looking for could not be found. It may have been deleted.
          </ThemedText>
          <Button title="Go Back" onPress={() => router.back()} accessibilityLabel="Go back" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Constraint Type Header */}
        <View style={[styles.typeHeader, { backgroundColor: `${typeInfo.color}15` }]}>
          <View style={[styles.typeIcon, { backgroundColor: `${typeInfo.color}30` }]}>
            <Ionicons name={typeInfo.icon} size={28} color={typeInfo.color} />
          </View>
          <View style={styles.typeInfo}>
            <ThemedText type="defaultSemiBold">{typeInfo.title}</ThemedText>
            <ThemedText type="caption">{typeInfo.description}</ThemedText>
          </View>
        </View>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Basic Information
          </ThemedText>

          <FormInput
            label="Title"
            value={formData.title}
            onChangeText={(text) => updateField('title', text)}
            placeholder="Give this constraint a name"
            error={errors.title}
          />

          <FormInput
            label="Description (optional)"
            value={formData.description}
            onChangeText={(text) => updateField('description', text)}
            placeholder="Add any notes or context"
            multiline
            numberOfLines={3}
            style={styles.multilineInput}
          />

          <FormDatePicker
            label="Start Date"
            value={formData.startDate}
            onChange={(date) => updateField('startDate', date)}
            placeholder="When does this start?"
            error={errors.startDate}
          />

          <FormDatePicker
            label="End Date (optional)"
            value={formData.endDate}
            onChange={(date) => updateField('endDate', date)}
            placeholder="When does this end?"
            minimumDate={formData.startDate || undefined}
            helpText="Leave blank if ongoing or unknown"
            allowClear
          />
        </View>

        {/* Constraint Type Specific Fields */}
        {renderConstraintTypeFields()}

        {/* Action Buttons (only when editing) */}
        {isEditing && (
          <View style={styles.editActions}>
            <Button
              title="Mark as Resolved"
              variant="secondary"
              onPress={handleResolve}
              disabled={isSaving}
              accessibilityLabel="Mark constraint as resolved"
            />
            <Button
              title="Delete Constraint"
              variant="text"
              onPress={handleDelete}
              disabled={isSaving}
              accessibilityLabel="Delete this constraint"
            />
          </View>
        )}
      </ScrollView>

      {/* Save/Cancel Buttons */}
      <View style={styles.actions}>
        <Button
          title={isEditing ? 'Save Changes' : 'Add Constraint'}
          onPress={handleSave}
          disabled={isSaving || (!isEditing && !isReady)}
          accessibilityLabel={isEditing ? 'Save constraint changes' : 'Add new constraint'}
        />
        <Button
          title="Cancel"
          variant="text"
          onPress={() => router.back()}
          disabled={isSaving}
          accessibilityLabel="Cancel and go back"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorTitle: {
    marginTop: 8,
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 4,
  },
  fieldDescription: {
    marginBottom: 12,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  checkboxList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  editActions: {
    gap: 12,
    marginTop: 8,
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
});
