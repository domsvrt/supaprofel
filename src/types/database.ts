export type ResourceType = 'file' | 'image' | 'video' | 'link';

export type ModuleRow = {
  created_at: string;
  description: string | null;
  file_name: string | null;
  file_size: number | null;
  id: string;
  mime_type: string | null;
  owner_id: string;
  resource_type: ResourceType | null;
  resource_url: string | null;
  storage_path: string | null;
  title: string;
  updated_at: string;
};

export type ModuleInsert = {
  created_at?: string;
  description?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  id?: string;
  mime_type?: string | null;
  owner_id: string;
  resource_type?: ResourceType | null;
  resource_url?: string | null;
  storage_path?: string | null;
  title: string;
  updated_at?: string;
};

export type ModuleUpdate = Partial<ModuleInsert>;

export type Database = {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      app_config: {
        Insert: { id?: boolean; teacher_id: string };
        Relationships: [];
        Row: { id: boolean; teacher_id: string };
        Update: { id?: boolean; teacher_id?: string };
      };
      modules: {
        Insert: ModuleInsert;
        Relationships: [];
        Row: ModuleRow;
        Update: ModuleUpdate;
      };
    };
    Views: Record<string, never>;
  };
};

export type Module = {
  createdAt: string;
  description: string | null;
  fileName: string | null;
  fileSize: number | null;
  id: string;
  mimeType: string | null;
  ownerId: string;
  resourceType: ResourceType | null;
  resourceUrl: string | null;
  storagePath: string | null;
  title: string;
  updatedAt: string;
};
