export interface Team {
  id: string;
  access_code?: string;
  team_name: string;
  proponents: string[];
  program: string;
  class: string;
  email: string;
  contact_num: string;
  adviser: string;
  createdAt: any;
}

export interface Project {
  id: string;
  teamId: string;
  project_title: string;
  school_year?: string;
  description: string;
  objectives: string;
  status: 'In Progress' | 'Completed' | 'Archived';
  createdAt: any;
}

export interface Defense {
  id: string;
  teamId: string;
  defense_type: string;
  defense_date: string;
  defense_time: string;
  panelists: string[];
  recommendations: 'accept with revisions' | 're-defense' | 'not accepted' | '';
  suggestions: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  createdAt: any;
}

export interface Consultation {
  id: string;
  teamId: string;
  issues: string;
  recommendations: string;
  createdAt: any;
}

export interface AdminConfig {
  updatedAt: any;
}

export interface Panelist {
  id: string;
  name: string;
  designation: string;
  position: string;
  email: string;
  contact: string;
  createdAt?: any;
}
