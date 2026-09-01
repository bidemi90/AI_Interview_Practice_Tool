export const predefinedRoles = [
  {
    key: 'software-developer', title: 'Software Developer',
    description: 'Designs, builds, tests, and maintains software applications and services.',
    responsibilities: ['Develop maintainable software', 'Debug defects', 'Review code', 'Collaborate with product and engineering teams'],
    skills: ['Programming fundamentals', 'Git', 'Databases', 'APIs', 'Testing', 'Debugging'],
  },
  {
    key: 'frontend-developer', title: 'Frontend Developer',
    description: 'Builds accessible, responsive, and performant web user interfaces.',
    responsibilities: ['Implement user interfaces', 'Integrate APIs', 'Improve accessibility and performance', 'Collaborate with designers'],
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Web accessibility', 'Frontend testing'],
  },
  {
    key: 'backend-developer', title: 'Backend Developer',
    description: 'Builds secure server-side applications, APIs, and data integrations.',
    responsibilities: ['Design APIs', 'Model data', 'Secure services', 'Monitor and debug backend systems'],
    skills: ['Server-side programming', 'API design', 'Databases', 'Authentication', 'Testing', 'Security'],
  },
  {
    key: 'full-stack-developer', title: 'Full Stack Developer',
    description: 'Develops complete web applications across frontend and backend systems.',
    responsibilities: ['Build end-to-end features', 'Design APIs and interfaces', 'Manage data flows', 'Test and deploy applications'],
    skills: ['JavaScript', 'React', 'Node.js', 'APIs', 'Databases', 'Git'],
  },
  {
    key: 'accountant', title: 'Accountant',
    description: 'Maintains accurate financial records and supports reporting and compliance.',
    responsibilities: ['Prepare financial records', 'Reconcile accounts', 'Support tax and audits', 'Produce financial reports'],
    skills: ['Financial accounting', 'Bookkeeping', 'Reconciliation', 'Financial statements', 'Excel', 'Tax'],
  },
  {
    key: 'customer-support-representative', title: 'Customer Support Representative',
    description: 'Resolves customer issues and delivers clear, empathetic product support.',
    responsibilities: ['Respond to enquiries', 'Troubleshoot issues', 'Document cases', 'Escalate complex problems'],
    skills: ['Communication', 'Empathy', 'Conflict resolution', 'Product knowledge', 'Ticket management'],
  },
  {
    key: 'project-manager', title: 'Project Manager',
    description: 'Plans and coordinates projects to deliver agreed outcomes on time and budget.',
    responsibilities: ['Plan scope and schedule', 'Manage risks', 'Coordinate stakeholders', 'Track delivery and budgets'],
    skills: ['Project planning', 'Risk management', 'Stakeholder communication', 'Scheduling', 'Budgeting'],
  },
  {
    key: 'administrative-assistant', title: 'Administrative Assistant',
    description: 'Provides organized operational, scheduling, and communication support.',
    responsibilities: ['Manage calendars', 'Prepare documents', 'Coordinate meetings', 'Maintain records'],
    skills: ['Organization', 'Scheduling', 'Written communication', 'Office software', 'Confidentiality'],
  },
  {
    key: 'data-analyst', title: 'Data Analyst',
    description: 'Transforms data into reliable insights that support business decisions.',
    responsibilities: ['Clean and analyze data', 'Build reports', 'Explain findings', 'Validate data quality'],
    skills: ['SQL', 'Excel', 'Statistics', 'Data visualization', 'Data cleaning', 'Business analysis'],
  },
  {
    key: 'sales-representative', title: 'Sales Representative',
    description: 'Builds customer relationships and guides prospects through the sales process.',
    responsibilities: ['Prospect for customers', 'Understand customer needs', 'Present solutions', 'Manage a sales pipeline'],
    skills: ['Consultative selling', 'Negotiation', 'Communication', 'CRM usage', 'Pipeline management'],
  },
];

export const predefinedRoleMap = new Map(predefinedRoles.map((role) => [role.key, role]));
