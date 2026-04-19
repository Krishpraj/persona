export type DataSourceKind = "doc" | "nodegraph" | "csv" | "pdf";

export type DataSource = {
  id: string;
  kind: DataSourceKind;
  name: string;
  data: Record<string, unknown>;
  position: number;
  updated_at?: string;
};

export type DocBlock =
  | { id: string; type: "text"; text: string }
  | {
      id: string;
      type: "image";
      storage_path: string;
      url: string;
      alt: string;
      caption: string;
    };

export type DocData = {
  blocks: DocBlock[];
};

export type CsvData = {
  filename: string;
  columns: string[];
  rows?: Record<string, string>[];
  storage_path?: string;
  total_rows?: number;
};

export type PdfPageText = { page: number; text: string };

export type PdfData = {
  filename: string;
  storage_path: string;
  size: number;
  page_count: number;
  text?: string;
  pages?: PdfPageText[];
  url?: string;
};
