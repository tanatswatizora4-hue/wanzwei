export type ProfessionalDocumentRow = {
  id: string;
  user_id: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  content_type: string;
  created_at: string;
};

export type FacilityVerificationDocumentRow = {
  id: string;
  user_id: string;
  facility_id: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  content_type: string;
  created_at: string;
};
