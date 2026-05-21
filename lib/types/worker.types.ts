export interface WorkerProfessionDto {
  id: string;
  code: string | null;
  name: string | null;
}

export interface WorkerDocumentDto {
  id: string;
  type: string | null;
  fileName: string | null;
  fileUrl: string | null;
  createdAt: string;
}

export interface WorkerSummaryDto {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  isApproved: boolean;
  isVerified: boolean;
  rating: number;
  createdAt: string;
}

export interface WorkerDetailDto {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  age: number | null;
  address: string | null;
  gender: string | null;
  experience: number | null;
  isApproved: boolean;
  isVerified: boolean;
  rating: number;
  profilePictureUrl: string | null;
  professions: WorkerProfessionDto[] | null;
  documents: WorkerDocumentDto[] | null;
}

export interface WorkerApprovalDto {
  id: string;
  isApproved: boolean;
}

export interface RejectWorkerRequest {
  reason?: string;
}

export interface RejectWorkerDocRequest {
  reason?: string;
}
