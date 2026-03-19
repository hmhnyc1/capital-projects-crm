export type ContactType = 'lead' | 'contact'
export type ContactStatus = 'active' | 'inactive' | 'qualified' | 'unqualified'
export type DealStage = 'Prospecting' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost'
export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task'

export interface Contact {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company: string | null
  title: string | null
  type: ContactType
  status: ContactStatus
  source: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  user_id: string
  title: string
  contact_id: string | null
  value: number | null
  stage: DealStage
  probability: number | null
  expected_close_date: string | null
  description: string | null
  created_at: string
  updated_at: string
  contacts?: Contact
}

export interface Activity {
  id: string
  user_id: string
  contact_id: string | null
  deal_id: string | null
  type: ActivityType
  title: string
  content: string | null
  due_date: string | null
  completed: boolean
  created_at: string
  updated_at: string
  contacts?: Contact
  deals?: Deal
}
