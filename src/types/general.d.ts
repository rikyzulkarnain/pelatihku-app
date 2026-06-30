export type FormState = {
  status?: string;
  errors?: {
    [key: string]: string[] | undefined;
    _form?: string[];
  };
};
