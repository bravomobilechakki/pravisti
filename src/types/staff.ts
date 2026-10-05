// ==================== STAFF DATA MODELS ==================== //

export type StaffStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type AssignmentStatus = "ASSIGNED" | "ACTIVE" | "COMPLETED" | "REMOVED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
export type DelayResponsibility = "COMPANY" | "STAFF" | "EXTERNAL" | null;

export interface StaffMember {
  _id: string;
  id?: string;
  companyId: string;
  name: string;
  mobileNumber: string;
  role: string;
  hourlyRate: number;
  email?: string | null;
  skillTags?: string[];
  status: StaffStatus;
  isDeleted?: boolean;
  assignmentsCount?: number;
  activeAssignments?: StaffAssignment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffAssignment {
  _id: string;
  companyId: string;
  projectId: {
    _id: string;
    name: string;
    projectNumber?: string;
  } | string;
  stageId?: {
    _id: string;
    name: string;
  } | string;
  milestoneId?: {
    _id: string;
    name: string;
  } | string;
  staffId: {
    _id: string;
    name: string;
    email?: string;
    mobileNumber: string;
  } | string;
  role: string;
  hourlyRateSnapshot: number;
  estimatedHours: number;
  actualHours: number;
  status: AssignmentStatus;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffTimeLog {
  _id: string;
  companyId: string;
  projectId: string;
  stageId?: string;
  milestoneId?: string;
  taskId?: string;
  staffId: {
    _id: string;
    name: string;
    mobileNumber: string;
  } | string;
  hours: number;
  hourlyRateSnapshot: number;
  totalLaborCost: number;
  logDate: string;
  notes?: string;
  createdAt?: string;
}

export interface StaffLoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      _id: string;
      name: string;
      mobileNumber: string;
      email?: string;
      role: string;
      hourlyRate?: number;
      roles: string[];
      isStaff: boolean;
      companyId: string;
      companyName: string;
      dashboardRedirect: string;
    };
  };
}
