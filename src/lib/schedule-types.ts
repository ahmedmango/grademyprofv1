export interface CourseEntry {
  id: string;
  schedule_id: string;
  course_name: string;
  section: string | null;
  professor_name: string;
  professor_id: string | null;
  days: string[];
  start_time: string;
  end_time: string;
  location: string | null;
  color: string;
  credit_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  semester_name: string;
  is_active: boolean;
  week_start: "sun" | "mon";
  created_at: string;
  updated_at: string;
  course_entries: CourseEntry[];
}
