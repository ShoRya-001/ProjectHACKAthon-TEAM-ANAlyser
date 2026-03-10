// Sample demo data for all three sources

export const SAMPLE_GITHUB_CSV = `number,title,user,state,created_at,merged_at,closed_at,additions,deletions,changed_files,reviewers,review_comments,labels
101,Add user authentication flow,jdoe,closed,2024-01-15T09:00:00Z,2024-01-16T14:00:00Z,2024-01-16T14:00:00Z,342,45,8,sarah;mike,5,feature
102,Fix payment processing bug,sarah,closed,2024-01-15T11:00:00Z,2024-01-15T15:00:00Z,2024-01-15T15:00:00Z,28,12,3,jdoe,2,bugfix
103,Refactor database queries,mike,open,2024-01-16T10:00:00Z,,,580,120,15,jdoe,8,refactor
104,Update API documentation,alex,closed,2024-01-14T08:00:00Z,2024-01-14T12:00:00Z,2024-01-14T12:00:00Z,156,23,4,jdoe;sarah,1,docs
105,Add notification service,jdoe,closed,2024-01-13T09:00:00Z,2024-01-15T18:00:00Z,2024-01-15T18:00:00Z,445,67,12,sarah,4,feature
106,Performance optimization for search,jdoe,open,2024-01-16T14:00:00Z,,,210,35,6,mike,3,performance
107,Fix CSS layout issues,priya,closed,2024-01-15T10:00:00Z,2024-01-15T11:30:00Z,2024-01-15T11:30:00Z,34,18,2,alex,1,bugfix
108,Add export to CSV feature,sarah,open,2024-01-16T08:00:00Z,,,178,12,5,jdoe,0,feature
109,Implement rate limiting,mike,closed,2024-01-12T09:00:00Z,2024-01-14T16:00:00Z,2024-01-14T16:00:00Z,267,34,7,jdoe;alex,6,security
110,Update dependencies,alex,closed,2024-01-16T07:00:00Z,2024-01-16T09:00:00Z,2024-01-16T09:00:00Z,12,45,1,sarah,0,chore
111,Add dark mode support,priya,open,2024-01-15T14:00:00Z,,,89,4,6,,0,feature
112,Fix memory leak in worker,jdoe,closed,2024-01-14T16:00:00Z,2024-01-16T11:00:00Z,2024-01-16T11:00:00Z,56,23,3,mike;sarah,7,bugfix`;

export const SAMPLE_JIRA_CSV = `key,summary,status,assignee,reporter,issue_type,priority,story_points,created,updated,resolved,labels,sprint,flagged
PROJ-101,User authentication flow,In Progress,John Doe,PM Team,Story,High,5,2024-01-10,2024-01-16,,auth;sprint-12,Sprint 12,false
PROJ-102,Payment processing bug,Done,Sarah Chen,QA Team,Bug,Critical,3,2024-01-12,2024-01-15,2024-01-15,payments;sprint-12,Sprint 12,false
PROJ-103,Database query optimization,In Review,Mike Johnson,John Doe,Story,High,8,2024-01-08,2024-01-16,,performance;sprint-12,Sprint 12,false
PROJ-104,API documentation update,Done,Alex Kim,PM Team,Task,Low,2,2024-01-11,2024-01-14,2024-01-14,docs;sprint-12,Sprint 12,false
PROJ-105,Notification service,In Progress,John Doe,PM Team,Story,High,5,2024-01-09,2024-01-16,,notifications;sprint-12,Sprint 12,false
PROJ-106,Search performance,Blocked,John Doe,QA Team,Story,Critical,5,2024-01-10,2024-01-16,,search;sprint-12,Sprint 12,true
PROJ-107,CSS layout fixes,Done,Priya Patel,QA Team,Bug,Medium,1,2024-01-14,2024-01-15,2024-01-15,ui;sprint-12,Sprint 12,false
PROJ-108,CSV export feature,To Do,Sarah Chen,PM Team,Story,Medium,3,2024-01-15,2024-01-16,,export;sprint-12,Sprint 12,false
PROJ-109,Rate limiting implementation,Done,Mike Johnson,Tech Lead,Story,High,5,2024-01-08,2024-01-14,2024-01-14,security;sprint-12,Sprint 12,false
PROJ-110,Dependency updates,Done,Alex Kim,Alex Kim,Task,Low,1,2024-01-16,2024-01-16,2024-01-16,chore;sprint-12,Sprint 12,false
PROJ-111,Dark mode support,To Do,Priya Patel,PM Team,Story,Low,3,2024-01-14,2024-01-15,,ui;sprint-12,Sprint 12,false
PROJ-112,Worker memory leak,In Progress,John Doe,SRE Team,Bug,Critical,3,2024-01-13,2024-01-16,,infrastructure;sprint-12,Sprint 12,true
PROJ-113,Setup CI/CD pipeline,To Do,,,Task,Medium,2,2024-01-16,2024-01-16,,devops;sprint-12,Sprint 12,false
PROJ-114,User feedback modal,To Do,Sarah Chen,PM Team,Story,Medium,2,2024-01-16,2024-01-16,,ux;sprint-12,Sprint 12,false`;

export const SAMPLE_STANDUP_TEXT = `John Doe:
- Yesterday: Continued work on PROJ-105 notification service, fixed the memory leak in PROJ-112
- Today: Will focus on PROJ-106 search performance, need to investigate the query bottleneck
- Blockers: Blocked on PROJ-106 - waiting for DBA team to grant production read replica access. Feeling a bit overwhelmed with the workload this sprint.

Sarah Chen:
- Yesterday: Completed PROJ-102 payment bug fix, shipped to prod
- Today: Starting PROJ-108 CSV export feature, will review Mike's PR
- Blockers: None, things are going smoothly!

Mike Johnson:
- Yesterday: Worked on PROJ-103 database refactor, PR is up for review
- Today: Continue PROJ-103, address review comments from John
- Blockers: PR #103 has been in review for 2 days, need faster turnaround on reviews

Alex Kim:
- Yesterday: Finished PROJ-110 dependency updates, merged. Updated API docs for PROJ-104
- Today: Will help with PROJ-113 CI/CD setup if unblocked
- Blockers: Waiting on DevOps team for AWS access credentials for CI/CD pipeline

Priya Patel:
- Yesterday: Fixed CSS issues in PROJ-107, merged
- Today: Starting dark mode implementation PROJ-111
- Blockers: Need design specs from UX team for dark mode color palette`;
