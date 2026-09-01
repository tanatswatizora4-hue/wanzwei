export type SignupPayload = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  organisationName?: string;
  location?: string;
  facilityType?: string;
};

export type SignupFieldFlags = {
  hasName: boolean;
  hasEmail: boolean;
  hasPassword: boolean;
  hasOrganisationName: boolean;
  hasLocation: boolean;
  hasFacilityType: boolean;
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
    organisationName: readFormText(formData, "organisationName"),
    location: readFormText(formData, "location"),
    facilityType: readFormText(formData, "facilityType"),
  };
}

export function signupFieldFlags(payload: SignupPayload): SignupFieldFlags {
  return {
    hasName: Boolean(payload.name),
    hasEmail: Boolean(payload.email),
    hasPassword: Boolean(payload.password),
    hasOrganisationName: Boolean(payload.organisationName),
    hasLocation: Boolean(payload.location),
    hasFacilityType: Boolean(payload.facilityType),
    role: payload.role,
  };
}
