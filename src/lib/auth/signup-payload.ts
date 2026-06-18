export type SignupPayload = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
};

export type SignupFieldFlags = {
  hasName: boolean;
  hasEmail: boolean;
  hasPassword: boolean;
  role?: string;
};

function readFormText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (value === null || typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readSignupPayload(formData: FormData): SignupPayload {
  return {
    name: readFormText(formData, "name"),
    email: readFormText(formData, "email"),
    password: readFormText(formData, "password"),
    role: readFormText(formData, "role"),
  };
}

export function signupFieldFlags(payload: SignupPayload): SignupFieldFlags {
  return {
    hasName: Boolean(payload.name),
    hasEmail: Boolean(payload.email),
    hasPassword: Boolean(payload.password),
    role: payload.role,
  };
}
