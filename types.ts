
export enum Transformation {
  Spaces = 'spaces',
  Commas = 'commas',
  Lowercase = 'lowercase',
  Uppercase = 'uppercase',
  TitleCase = 'titlecase',
  Accents = 'accents',
  RemoveDecimals = 'removedecimals',
}

export type TransformationsState = {
  [key in Transformation]: boolean;
};