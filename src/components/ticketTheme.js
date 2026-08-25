export const T = {
  ink: '#0C1524',
  body: '#26313F',
  muted: '#5C7291',
  soft: '#6B7A93',
  faint: '#8397B0',
  hint: '#9AAAC0',
  hair: '#EDF1F7',
  field: '#F2F5F9',
  surface: '#FFFFFF',

  blue: '#1B72E8',
  blueInk: '#1B5FC0',
  blueTint: '#EAF2FE',

  green: '#188A62',
  greenInk: '#1E6B50',
  greenTint: '#DFF3EA',

  amber: '#D9722B',
  amberInk: '#A85618',
  amberTint: '#FEF1E7',

  violet: '#6D45C8',
  violetTint: '#F0EAFB',

  danger: '#C0392B',
  dangerInk: '#96271B',
  dangerTint: '#FDECEA',
};

export const CARD_SHADOW = {
  shadowColor: '#1C365C',
  shadowOpacity: 0.07,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

export const FLOAT_SHADOW = {
  shadowColor: '#1C365C',
  shadowOpacity: 0.09,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 5 },
  elevation: 5,
};

// Field, label and primary-button recipes reused by every helper form.
export const FORM = {
  label: { fontSize: 11.5, fontWeight: '600', color: T.soft, marginBottom: 7 },
  input: {
    backgroundColor: T.field,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    color: T.ink,
    minHeight: 52,
  },
  textArea: {
    backgroundColor: T.field,
    borderRadius: 16,
    padding: 15,
    fontSize: 15,
    lineHeight: 22,
    color: T.ink,
    minHeight: 108,
    textAlignVertical: 'top',
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.ink,
    borderRadius: 999,
    height: 52,
  },
  primaryText: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  disabled: { opacity: 0.45 },
  errorText: { fontSize: 13, lineHeight: 19, color: T.dangerInk, marginBottom: 12 },
};
