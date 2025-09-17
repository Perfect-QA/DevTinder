// File upload types
export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  type: 'image' | 'file';
  mimetype: string;
  url: string;
  uploadedAt: string;
}

// Test case types
export interface TestCase {
  id: number;
  summary: string;
  precondition: string;
  steps: string;
  expectedResult: string;
  priority: 'P1' | 'P2' | 'P3';
}

// Component prop types
export interface LayoutProps {
  children: React.ReactNode;
}

export interface SidebarProps {}

export interface HeaderProps {}

export interface UploadTestDataProps {}

// Redux state types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  loading: boolean;
}

export interface RootState {
  auth: AuthState;
  ui: UIState;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  files: UploadedFile[];
  error?: string;
  cacheInfo?: {
    totalFiles: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

// Form types
export interface FileUploadFormData {
  files: FileList;
}

// Event handler types
export type FileChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => void;
export type FileSelectHandler = () => void;
export type FileRemoveHandler = (fileId: string) => void;
export type FileOpenHandler = (file: UploadedFile) => void;
export type DragEventHandler = (event: React.DragEvent<HTMLDivElement>) => void;
export type TestSelectionHandler = (testId: number) => void;
export type ExportHandler = () => void;
