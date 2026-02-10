import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ConstraintFormScreen from '../constraint-form';

// Mock expo-router
const mockRouterBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: mockRouterBack,
    push: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ type: 'injury' })),
}));

// Get the mock for useLocalSearchParams
import { useLocalSearchParams } from 'expo-router';
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

// Mock constraint for edit mode
const mockExistingConstraint = {
  id: '123',
  athlete_id: 'athlete-1',
  constraint_type: 'travel',
  title: 'Business Trip',
  description: 'Visiting NYC office',
  start_date: '2026-02-01',
  end_date: '2026-02-05',
  status: 'active',
  injury_body_part: null,
  injury_severity: null,
  injury_restrictions: null,
  travel_destination: 'New York',
  travel_equipment_available: ['running_shoes'],
  travel_facilities_available: ['hotel_gym'],
  availability_hours_per_week: null,
  availability_days_available: null,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

// Mock useConstraints hook
const mockGetConstraint = jest.fn().mockResolvedValue(mockExistingConstraint);
const mockCreateConstraint = jest.fn().mockResolvedValue({ success: true });
const mockUpdateConstraint = jest.fn().mockResolvedValue({ success: true });
const mockDeleteConstraint = jest.fn().mockResolvedValue({ success: true });
const mockResolveConstraint = jest.fn().mockResolvedValue({ success: true });

let mockIsReady = true;

jest.mock('@/hooks', () => ({
  useConstraints: () => ({
    constraints: [],
    isLoading: false,
    get isReady() {
      return mockIsReady;
    },
    error: null,
    getConstraint: mockGetConstraint,
    createConstraint: mockCreateConstraint,
    updateConstraint: mockUpdateConstraint,
    deleteConstraint: mockDeleteConstraint,
    resolveConstraint: mockResolveConstraint,
    refetch: jest.fn(),
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ConstraintFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ type: 'injury' });
    mockIsReady = true;
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<ConstraintFormScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders the constraint type header', () => {
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Injury');
      expect(json).toContain('Log an injury so Khepri can adjust your training');
    });

    it('renders Basic Information section', () => {
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Basic Information');
      expect(json).toContain('Title');
      expect(json).toContain('Description');
      expect(json).toContain('Start Date');
      expect(json).toContain('End Date');
    });

    it('renders Injury Details section for injury type', () => {
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Injury Details');
      expect(json).toContain('Affected Body Part');
      expect(json).toContain('Severity');
      expect(json).toContain('Training Restrictions');
    });

    it('renders Add Constraint button', () => {
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Add Constraint');
    });

    it('renders Cancel button', () => {
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Cancel');
    });

    it('renders restriction options', () => {
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No running');
      expect(json).toContain('No cycling');
      expect(json).toContain('No swimming');
    });

    it('renders severity field', () => {
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Severity');
    });

    it('renders body part selection', () => {
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Affected Body Part');
    });
  });

  describe('Different Constraint Types', () => {
    it('renders travel constraint type fields', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Travel');
      expect(json).toContain('Travel Details');
      expect(json).toContain('Destination');
      expect(json).toContain('Equipment Available');
      expect(json).toContain('Facilities Available');
    });

    it('renders availability constraint type fields', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Availability Change');
      expect(json).toContain('Availability Details');
      expect(json).toContain('Available Hours Per Week');
      expect(json).toContain('Available Days');
    });

    it('defaults to injury type when type param is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Injury');
      expect(json).toContain('Injury Details');
    });

    it('shows correct description for travel type', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Traveling? Let Khepri know what equipment and facilities');
    });

    it('shows correct description for availability type', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Temporary schedule change?');
    });
  });

  describe('Edit Mode', () => {
    it('shows Save Changes button when editing', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury', id: '123' });
      const { toJSON, queryByText } = render(<ConstraintFormScreen />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(queryByText('Loading constraint...')).toBeNull();
      });

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Save Changes');
    });

    it('shows Delete Constraint button when editing', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury', id: '123' });
      const { toJSON, queryByText } = render(<ConstraintFormScreen />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(queryByText('Loading constraint...')).toBeNull();
      });

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Delete Constraint');
    });

    it('shows Mark as Resolved button when editing', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury', id: '123' });
      const { toJSON, queryByText } = render(<ConstraintFormScreen />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(queryByText('Loading constraint...')).toBeNull();
      });

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Mark as Resolved');
    });

    it('does not show Delete Constraint button when adding new constraint', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Delete Constraint');
    });

    it('does not show Mark as Resolved button when adding new constraint', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Mark as Resolved');
    });

    it('shows confirmation dialog when delete is pressed', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury', id: '123' });
      const { getByLabelText, queryByText } = render(<ConstraintFormScreen />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(queryByText('Loading constraint...')).toBeNull();
      });

      fireEvent.press(getByLabelText('Delete this constraint'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Constraint',
        'Are you sure you want to delete this constraint?',
        expect.any(Array)
      );
    });

    it('shows confirmation dialog when resolve is pressed', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury', id: '123' });
      const { getByLabelText, queryByText } = render(<ConstraintFormScreen />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(queryByText('Loading constraint...')).toBeNull();
      });

      fireEvent.press(getByLabelText('Mark constraint as resolved'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Resolve Constraint',
        'Mark this constraint as resolved?',
        expect.any(Array)
      );
    });
  });

  describe('Form Validation', () => {
    it('shows error when title is empty on save', () => {
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.press(getByLabelText('Add new constraint'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a title');
    });

    it('shows error for injury type when body part is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      // Fill in title using accessibilityLabel (which is the label text)
      fireEvent.changeText(getByLabelText('Title'), 'Knee Pain');
      fireEvent.press(getByLabelText('Add new constraint'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please select the affected body part');
    });

    it('shows error for injury type when severity is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Knee Pain');
      fireEvent.press(getByLabelText('Add new constraint'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please select the severity');
    });

    it('shows error for availability type when hours is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Busy Week');
      fireEvent.press(getByLabelText('Add new constraint'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter available hours');
    });

    it('shows error for availability type when hours is invalid (negative)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Busy Week');
      fireEvent.changeText(getByLabelText('Available Hours Per Week'), '-5');
      fireEvent.press(getByLabelText('Add new constraint'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a valid number (0-168)');
    });

    it('shows error for availability type when hours is too high', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Busy Week');
      fireEvent.changeText(getByLabelText('Available Hours Per Week'), '200');
      fireEvent.press(getByLabelText('Add new constraint'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a valid number (0-168)');
    });

    it('shows error for availability type when hours is NaN', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Busy Week');
      fireEvent.changeText(getByLabelText('Available Hours Per Week'), 'abc');
      fireEvent.press(getByLabelText('Add new constraint'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a valid number (0-168)');
    });

    it('clears error when field is updated', () => {
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      // Trigger validation error
      fireEvent.press(getByLabelText('Add new constraint'));
      let json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a title');

      // Fill in the field
      fireEvent.changeText(getByLabelText('Title'), 'My Constraint');

      json = JSON.stringify(toJSON());
      expect(json).not.toContain('Please enter a title');
    });
  });

  describe('Form Interactions', () => {
    it('updates title field when typing', () => {
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Knee Injury');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Knee Injury');
    });

    it('updates description field when typing', () => {
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Description (optional)'), 'Pain on left side');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Pain on left side');
    });

    it('updates destination field when typing (travel type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Destination'), 'Paris, France');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Paris, France');
    });

    it('updates available hours field (availability type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Available Hours Per Week'), '10');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('10');
    });

    it('renders Cancel button with correct label', () => {
      const { getByLabelText } = render(<ConstraintFormScreen />);

      expect(getByLabelText('Cancel and go back')).toBeTruthy();
    });
  });

  describe('CheckboxList Interactions', () => {
    it('toggles restriction checkbox when pressed (injury type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      // Press "No running" checkbox
      fireEvent.press(getByLabelText('No running, not selected'));

      // Should now show as selected
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No running, selected');
    });

    it('untoggle restriction checkbox when pressed again', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      // Press "No running" checkbox to select
      fireEvent.press(getByLabelText('No running, not selected'));
      // Press again to deselect
      fireEvent.press(getByLabelText('No running, selected'));

      // Should now show as not selected
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No running, not selected');
    });

    it('toggles equipment checkbox when pressed (travel type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.press(getByLabelText('Running shoes, not selected'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Running shoes, selected');
    });

    it('toggles facility checkbox when pressed (travel type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.press(getByLabelText('Gym, not selected'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Gym, selected');
    });

    it('toggles day checkbox when pressed (availability type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.press(getByLabelText('Monday, not selected'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Monday, selected');
    });

    it('can select multiple checkboxes', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury' });
      const { getByLabelText, toJSON } = render(<ConstraintFormScreen />);

      fireEvent.press(getByLabelText('No running, not selected'));
      fireEvent.press(getByLabelText('No cycling, not selected'));
      fireEvent.press(getByLabelText('No swimming, not selected'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('No running, selected');
      expect(json).toContain('No cycling, selected');
      expect(json).toContain('No swimming, selected');
    });
  });

  describe('Successful Form Submission', () => {
    it('shows success alert when adding a travel constraint', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      const { getByLabelText } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Business Trip');

      fireEvent.press(getByLabelText('Add new constraint'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Constraint added successfully',
          expect.any(Array)
        );
      });
    });

    it('shows success alert when adding an availability constraint with valid hours', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { getByLabelText } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Busy Period');
      fireEvent.changeText(getByLabelText('Available Hours Per Week'), '5');

      fireEvent.press(getByLabelText('Add new constraint'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Constraint added successfully',
          expect.any(Array)
        );
      });
    });

    it('shows success alert when updating an existing constraint', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel', id: '123' });
      mockGetConstraint.mockResolvedValueOnce(mockExistingConstraint);

      const { getByLabelText, queryByText } = render(<ConstraintFormScreen />);

      // Wait for constraint to load (form populates with existing data)
      await waitFor(() => {
        expect(queryByText('Loading constraint...')).toBeNull();
      });

      // Wait for title field to be populated
      await waitFor(() => {
        expect(getByLabelText('Title').props.value).toBe('Business Trip');
      });

      fireEvent.changeText(getByLabelText('Title'), 'Updated Trip');
      fireEvent.press(getByLabelText('Save constraint changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Constraint updated successfully',
          expect.any(Array)
        );
      });
    });

    it('shows error state when constraint not found in edit mode', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury', id: 'invalid-id' });
      mockGetConstraint.mockResolvedValueOnce(null);

      const { toJSON, queryByText } = render(<ConstraintFormScreen />);

      // Wait for loading to complete and error UI to appear
      await waitFor(() => {
        expect(queryByText('Loading constraint...')).toBeNull();
      });

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Constraint Not Found');
        expect(json).toContain('could not be found');
        expect(json).toContain('Go Back');
      });
    });
  });

  describe('Travel Type Options', () => {
    it('renders all equipment options', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());

      expect(json).toContain('Running shoes');
      expect(json).toContain('Swim goggles');
      expect(json).toContain('Bike');
      expect(json).toContain('Bike trainer');
      expect(json).toContain('Resistance bands');
    });

    it('renders all facility options', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());

      expect(json).toContain('Gym');
      expect(json).toContain('Pool');
      expect(json).toContain('Outdoor running routes');
      expect(json).toContain('Hotel gym');
    });
  });

  describe('Availability Type Options', () => {
    it('renders all day options', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());

      expect(json).toContain('Monday');
      expect(json).toContain('Tuesday');
      expect(json).toContain('Wednesday');
      expect(json).toContain('Thursday');
      expect(json).toContain('Friday');
      expect(json).toContain('Saturday');
      expect(json).toContain('Sunday');
    });

    it('shows hours per week help text', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());

      expect(json).toContain('How many hours per week can you train?');
    });
  });

  describe('Injury Type Options', () => {
    it('renders all restriction options', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());

      expect(json).toContain('No running');
      expect(json).toContain('No cycling');
      expect(json).toContain('No swimming');
      expect(json).toContain('No high intensity');
      expect(json).toContain('No impact activities');
      expect(json).toContain('Limited training volume');
    });
  });

  describe('Constraint Type Icons', () => {
    it('shows bandage icon for injury type', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury' });
      const { toJSON } = render(<ConstraintFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('bandage-outline');
    });

    it('shows airplane icon for travel type', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      const { toJSON } = render(<ConstraintFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('airplane-outline');
    });

    it('shows time icon for availability type', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'availability' });
      const { toJSON } = render(<ConstraintFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('time-outline');
    });
  });

  describe('Date Picker Labels', () => {
    it('shows end date with help text', () => {
      const { toJSON } = render(<ConstraintFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Leave blank if ongoing or unknown');
    });
  });

  describe('useEffect for editing', () => {
    it('renders correctly with edit id parameter', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'injury', id: '123' });
      const { toJSON, queryByText } = render(<ConstraintFormScreen />);
      expect(toJSON()).toBeTruthy();

      // Wait for loading to complete
      await waitFor(() => {
        expect(queryByText('Loading constraint...')).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error alert when createConstraint fails', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      mockCreateConstraint.mockResolvedValueOnce({ success: false, error: 'Database error' });

      const { getByLabelText } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Business Trip');
      fireEvent.press(getByLabelText('Add new constraint'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Database error');
      });
    });

    it('shows generic error when createConstraint fails without message', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });
      mockCreateConstraint.mockResolvedValueOnce({ success: false });

      const { getByLabelText } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Business Trip');
      fireEvent.press(getByLabelText('Add new constraint'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to save constraint');
      });
    });

    it('shows error when updateConstraint fails', async () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel', id: '123' });
      mockGetConstraint.mockResolvedValueOnce(mockExistingConstraint);
      mockUpdateConstraint.mockResolvedValueOnce({ success: false, error: 'Update failed' });

      const { getByLabelText, queryByText } = render(<ConstraintFormScreen />);

      await waitFor(() => {
        expect(queryByText('Loading constraint...')).toBeNull();
      });

      fireEvent.press(getByLabelText('Save constraint changes'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Update failed');
      });
    });
  });

  describe('Invalid constraint type handling', () => {
    it('defaults to injury when type is invalid', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'invalid_type' });
      const { toJSON } = render(<ConstraintFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Injury');
      expect(json).toContain('Injury Details');
    });
  });

  describe('isReady guard', () => {
    it('shows alert when trying to add constraint before hook is ready', async () => {
      mockIsReady = false;
      mockUseLocalSearchParams.mockReturnValue({ type: 'travel' });

      const { getByLabelText } = render(<ConstraintFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Business Trip');
      fireEvent.press(getByLabelText('Add new constraint'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Please wait', 'Loading your profile...');
      });

      // createConstraint should not be called
      expect(mockCreateConstraint).not.toHaveBeenCalled();
    });
  });
});
