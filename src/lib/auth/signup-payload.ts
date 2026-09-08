export type SignupPayload = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  organisationName?: string;
  location?: string;
  facilityType?: string;
  profession?: string;
  registeringBody?: string;
  regulatoryBodyOther?: string;
  premisesNumber?: string;
};

export type SignupFieldFlags = {
  hasName: boolean;
  hasEmail: boolean;
  hasPassword: boolean;
  hasOrganisationName: boolean;
  hasLocation: boolean;
  hasFacilityType: boolean;
  hasProfession: boolean;
  hasRegisteringBody: boolean;
  hasRegulatoryBodyOther: boolean;
  hasPremisesNumber: boolean;
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
    profession: readFormText(formData, "profession"),
    registeringBody: readFormText(formData, "registeringBody"),
    regulatoryBodyOther: readFormText(formData, "regulatoryBodyOther"),
    premisesNumber: readFormText(formData, "premisesNumber"),
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
    hasProfession: Boolean(payload.profession),
    hasRegisteringBody: Boolean(payload.registeringBody),
    hasRegulatoryBodyOther: Boolean(payload.regulatoryBodyOther),
    hasPremisesNumber: Boolean(payload.premisesNumber),
    role: payload.role,
  };
}
