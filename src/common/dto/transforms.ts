export const trimText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export const numericScalar = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
