export type Role = "professional" | "facility" | "admin";

export type EmploymentType = "Full-time" | "Part-time" | "Locum" | "Contract" | "Permanent";

export type JobStatus = "Open" | "Interested" | "Shortlisted" | "Matched" | "Closed";
export type ApplicationStatus =
  | "Under Review"
  | "Screening"
  | "Shortlisted"
  | "Interview"
  | "Offer"
  | "Hired"
  | "Rejected";
export type VerificationStatus = "Pending" | "Under Review" | "Verified" | "Rejected";

export type User = {
  id: string;
  email: string;
  role: Role;
  name: string;
  avatar?: string;
  title?: string;
  location?: string;
  verified?: boolean;
  facilityId?: string;
  // facility-specific
  facilityName?: string;
  facilityType?: "Hospital" | "Clinic" | "Pharmacy" | "Laboratory" | "Radiology";
  // professional-specific
  profession?: string;
  cpdCredits?: number;
  cpdTarget?: number;
};

export type Facility = {
  id: string;
  name: string;
  type: "Hospital" | "Clinic" | "Pharmacy" | "Laboratory" | "Radiology";
  location: string;
  verified: boolean;
  rating: number;
  openRoles: number;
  logoColor: string; // tailwind gradient suffix
  initials: string;
};

export type Job = {
  id: string;
  title: string;
  facilityId: string;
  location: string;
  type: EmploymentType;
  salary?: string;
  postedAt: string; // ISO
  status: JobStatus;
  applicants: number;
  description: string;
  tags: string[];
  saved?: boolean;
  applied?: boolean;
};

export type Application = {
  id: string;
  jobId: string;
  professionalId: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  notes?: string;
};

export type Interview = {
  id: string;
  jobId: string;
  professionalId: string;
  date: string; // ISO
  duration: number; // minutes
  mode: "Onsite" | "Video" | "Phone";
};

export type Course = {
  id: string;
  title: string;
  provider: string;
  category: "Clinical" | "Compliance" | "Leadership" | "Tech" | "Wellbeing";
  duration: string;
  credits: number;
  progress: number; // 0-100
  status: "not_started" | "in_progress" | "completed";
  cover: string; // gradient classes
  recommended?: boolean;
};

export type Listing = {
  id: string;
  title: string;
  kind: "Clinic" | "Pharmacy" | "Hospital" | "Laboratory" | "Practice";
  mode: "Sale" | "Lease";
  location: string;
  price: number;
  currency: string;
  beds?: number;
  rooms?: number;
  staff?: number;
  posted: string;
  cover: string;
  description: string;
  confidential?: boolean;
};

export type Verification = {
  id: string;
  userId: string;
  name: string;
  profession: string;
  status: VerificationStatus;
  documentCount: number;
  submittedAt: string;
  flags?: string[];
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  kind: "match" | "application" | "verification" | "system" | "emergency";
};

// --- Emergency Locum Alerts (premium feature) ---

export type Urgency = "Standard" | "High" | "Critical";

export type AlertOverallStatus = "Sent" | "Filled" | "Expired" | "Cancelled";

export type AlertResponseStatus =
  | "Pending"
  | "Accepted"
  | "Declined"
  | "Expired";

export type AlertRecipient = {
  professionalId: string;
  professionalName: string;
  status: AlertResponseStatus;
  respondedAt?: string;
};

export type EmergencyAlert = {
  id: string;
  facilityId: string;
  profession: string;
  location: string;
  urgency: Urgency;
  shiftStart: string; // ISO
  shiftEnd: string; // ISO
  notes: string;
  payMin: number;
  payMax: number;
  payCurrency: "USD" | "ZWL" | "ZAR";
  payPeriod: "hour" | "shift" | "day";
  createdAt: string; // ISO
  expiresAt: string; // ISO
  status: AlertOverallStatus;
  recipients: AlertRecipient[];
  matchedCount: number;
};
